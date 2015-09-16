/*
 *
 * Special provider which can serve content from several providers.
 * File systems are listed as named folders in the root directory.
 *
 */
var UnionFio = function (fio, mounts, opts, prefix) {
    this.fio = fio;
    this.prefix = prefix || "/http_folders.io_0:union/";
    this.fuse = {};
    //this.mounts = mounts;
    //this.fuse = this.setup(opts
	this.setup(opts,mounts||[]);

};

module.exports = UnionFio;

UnionFio.prototype.setup = function (opts, mounts) {

    var self = this;
    for (var i = 0; i < mounts.length; ++i) {

        var mount = mounts[i];

        for (name in mount) {
            if (mount.hasOwnProperty(name)) {
                if (!self.fuse[name]) {
                    var provider = name;
                    var o = mount[name].create(self.prefix);
                    self.fuse[provider] = o;
                } else {

                    console.log("union setup: Error! " + name + " already mounted");
                }
            }

        }


    }


    /*	
      var prefix = this.prefix;
      var self = this ;	
      // opts is always list.
      opts = {"view": "list"};
      var mounts = this.mounts || mounts;		
      var paths = self.fuse;
      for(var i = 0; i < mounts.length; i++) {
        var folder = mounts[i];
        for(var name in folder) if(folder.hasOwnProperty(name)) {
        	console.log("setup:",name,",prefix:",prefix + name + "/");
    		if (!paths[name])
          paths[name] = folder[name].create(prefix + name + "/");
        };
      }
      		
      //return paths;
      console.log(paths);		
      self.fuse = paths;
      */
};

var normalizePath = function (prefix, path) {
    if (path != null && path.indexOf('@') > -1) {
        var preuri = path.substr(path.indexOf('@') + 1).substr(prefix.length);
        path = preuri;
    }
    return path;
};

UnionFio.prototype.asView = function (path, viewfs) {
    if (path.substr(0, 1) != "/") path = "/" + path;

    var subpos = path.indexOf("/", 1);
    var root = subpos > -1 ? path.substr(0, subpos) : path;
    var name = root.substr(1);
   // console.log("asView", name, path);
    if (!(name in viewfs)) {
        return false;
    }
    var rootfs = viewfs[name];
    var subpath = subpos > -1 ? path.substr(subpos) : "/";
    return {
        name: name,
        base: rootfs,
        path: subpath
    }
};

UnionFio.prototype.onList = function (data) {
    var fio = this.fio;
    var o = data.data;
    var uri = normalizePath(this.prefix, o.path);
    var lsMime = ["Content-Type:application/json"];

    this.ls(uri, data, function (files, err) {
        if (err) {
            return fio.post(o.streamId, null, lsMime, data.shareId);
        }

        fio.post(o.streamId, JSON.stringify(files), lsMime, data.shareId);
    });
};

UnionFio.prototype.cp = function (source, destination, cb) {

    var self = this;

    var paths = this.fuse;

    if (source == "" || source.substr(0, 1) != "/")
        source = "/" + source;

    if (destination == "" || destination.substr(0, 1) != "/")
        destination = "/" + destination;


    var sourceProvider = this.asView(source, paths);
    var destinationProvider = this.asView(destination, paths);

    if (!sourceProvider || !sourceProvider.base) {

        return cb(new Error("union cp: missing source file operand "));
    }

    if (!destinationProvider || !destinationProvider.base) {

        return cb(new Error("union cp: missing destination file operand"));
    }

    var sourceMount = sourceProvider.base;
    var sourceUri = sourceProvider.path;

    var destinationMount = destinationProvider.base;
    var destinationUri = destinationProvider.path;

    if (sourceUri === destinationUri) {

        return cb(new Error("Error! Both Source and destination are same "));
    }

    sourceMount.cat(sourceUri, function (err, source_r) {

        var file = source_r.stream;

        destinationMount.write(destinationUri, file, function (err) {

            if (err) {
                console.log("error occured in union cp() ", err);
                return cb(err);

            }

            cb();
        });


    });


};

UnionFio.prototype.umount = function (provider) {

    var self = this;

    if (provider in self.fuse) {
        delete self.fuse[provider];
    } else {

        console.log("union umount: Error! nothing to umount");
    }

};

UnionFio.prototype.ls = function (path, cb) {
    var self = this;

    var fio = this.fio;
    var prefix = this.prefix;
    var paths = this.fuse;

    if (path == "" || path.substr(0, 1) != "/")
        path = "/" + path;


    var multicast = false;

    var out = [];
    if (path == "" || path.substr(0, 1) != "/")
        path = "/" + path;
    if (path == "" || path.substr(-1) != "/")
        path = path + "/";

    // NOTES: List from all mounts.
    if (multicast) {
        for (var i in paths) {
            // self.onSubList(self.fio, paths[i], data);
            // FIXME: check if we want to send the list from all mounts in one time using cb() 
            var mount = paths[i];

            var uri = normalizePath(mount.prefix, path);
            console.log("mount ls ", uri, mount.prefix);
            mount.ls(uri, function (err, files) {
                if (err) {
                    console.log("error listing files,", uri, err);
                    return cb(err);
                }
                if (mount.meta)
                    mount.meta(uri, files, function (err, files) {
                        cb(null, files); //out.push(files);
                    });
                else
                    cb(null, files); // out.push(files);
            });
        }
        return;
    }

    // if multicast is disabled then first part of path should be the file system provider
    // it could be aws or local or memory or hdfs etc
    if (path == "/") {
        var mounts = [];
        for (var i in paths) {
            mounts.push(i);
        }
        mounts = providerAsFolders('/', mounts);
        cb(null, mounts);
    } else {

        var parts = this.asView(path, paths);

        if (!parts || !parts.base) {
            console.log("could not find path", path);
            return;
        }
        var mount = parts.base;
        var uri = parts.path;
        mount.ls(uri, function (err, data) {

            if (err) {
                return cb(err);
            }

            cb(null, data);
        });

        /*
        if (mount.ls) {
        	self.onSubList(self.fio, mount, data);
        } else {
        	console.log("mount does not provide file lists", parts);
        }
        */
    }
};

/**
 * @param uri, the file uri to cat 
 * @param cb, callback function. 
 *
 * The param of the callback function
 * @param result, json object including the stream, size, name information. example {stream: readableStream, size: 1024, name: "testfile"}
 * @param err, the err message of callback, the result param will be null if error, please check the err before using the result information.
 */
UnionFio.prototype.cat = function (path, cb) {
    var self = this;

    var prefix = this.prefix;
    var paths = this.fuse;
    var multicast = false;


    if (path == "" || path.substr(0, 1) != "/")
        path = "/" + path;

    //NOTES: cat from all mounts.
    if (multicast) {
        for (var i in paths) {
            var mount = paths[i];
            var uri = normalizePath(mount.prefix, path);
            console.log("mount cat", uri, mount.prefix);

            mount.cat(uri, function (result, err) {
                if (err) {
                    console.log("cat file error,", uri, err);
                    return cb(null, err);
                }

                cb(result);
            });
        }
        return;
    }


    var provider = this.asView(path, paths);
    if (!provider || !provider.base) {

        return cb(new Error("union cat: missing source file operand "));
    }

    var mount = provider.base;
    var uri = provider.path;

    mount.cat(uri, function (err, result) {

        if (err) {
            console.log("Error in union cat() " + err);
            return cb(err);
        }

        return cb(null, result);

    });


}

/**
 * @param path, string, the path 
 * @param data, the input data, 'stream.Readable' or 'Buffer'
 * @param cb, the callback function
 */
UnionFio.prototype.write = function (path, data, cb) {
    var self = this;

    var prefix = this.prefix;
    var paths = this.fuse;
    var multicast = false;

    if (path == "" || path.substr(0, 1) != "/")
        path = "/" + path;

    if (multicast) {
        var Readable = require('stream').Readable;
        // we first pause the stream from emitting data events
        if (data instanceof Readable) {
            data.pause();
        }

        for (var i in paths) {
            var mount = paths[i];
            var uri = normalizePath(mount.prefix, path);
            console.log("mount write", uri, mount.prefix);

            // write buffer data or pipe the input stream to dest writable stream
            mount.write(uri, data, function (result, err) {
                if (err) {
                    console.log("write file error ,", uri, err);
                    return cb(null, err);
                }

                cb(result);
            });
        }

        // after set all the dest stream, we resume the stream to pipe data.
        if (data instanceof Readable) {
            data.resume();
        }

        return;
    }

    var provider = this.asView(path, paths);
    if (!provider || !provider.base) {

        return cb(new Error("union cp: missing destination file operand"));
    }


    var mount = provider.base;
    var uri = provider.path;
    mount.write(uri, data, function (err) {

        if (err) {
            console.log("error occured in union write() ", err);
            return cb(err);

        }

        return cb();
    });

}

// FIXME : Dont need this code . results from various providers will already
// be translated into folders.io compatible records
/*
UnionFio.prototype.asFolder = function(dir, file) {
  var o = { name: file.name };
  o.fullPath = dir + file.name;
  if(!o.meta) o.meta = {};
  o.uri = "#" + this.prefix + o.fullPath;
  o.size = file.size || 0;
  //o.extension = "txt";
  //o.type = "text/plain";
  if(file.type == '1') {
      o.extension = '+folder';
      o.type = "";
  }
  return o;
};
*/

/*
 * This function translates providers records into folders.io
 * compatible records
 *
 */
var providerAsFolders = function (dir, providers) {
    var data = [];
    for (var i = 0; i < providers.length; ++i) {
        var o = {};
        o.name = providers[i];
        o.extension = '+folder';
        o.size = 0;
        o.type = "";
        o.fullPath = dir + o.name;
        //o.uri = "#" + this.prefix + o.fullPath;
        o.uri = o.fullPath;
        if (!o.meta)
            o.meta = {};
        var cols = ['permission', 'owner', 'group'];
        if (!o.meta) o.meta = {
            'group': 'union',
            'owner': 'union',
            'permission': 0
        };
        //FIXME: how to get modification date for providers ?
        o.modificationTime = Date.now();
        data.push(o);

    }
    return data;


};

/*
UnionFio.prototype.onSubList = function(fio, mount, data) {
  var o = data.data;
  var uri = normalizePath(mount.prefix, o.path);
  var lsMime = ["Content-Type:application/json"];

  var response = function(files) {
    fio.post(o.streamId, JSON.stringify(files), lsMime, data.shareId);
  }
  mount.ls(uri, function(files, err) {
    if(err) {
      console.log("error listing files", uri, err);
      return;
    }
    if(mount.meta) mount.meta(uri, files, function(files) {
        response(files);
    });
    else response(files);
  });
};
*/