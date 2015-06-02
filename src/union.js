/*
 *
 * Special provider which can serve content from several providers.
 * File systems are listed as named folders in the root directory.
 *
 */
var UnionFio = function(fio, mounts, opts, prefix) {
  this.fio = fio;
  this.prefix = prefix || "/http_folders.io_0:union/";
  this.mounts = mounts;
  this.fuse = this.setup(opts);
}

module.exports = UnionFio;

UnionFio.prototype.setup = function(opts) {
  var prefix = this.prefix;
  // opts is always list.
  opts = {"view": "list"};
  var mounts = this.mounts;
  var paths = {};
  for(var i = 0; i < mounts.length; i++) {
    var folder = mounts[i];
    for(var name in folder) if(folder.hasOwnProperty(name)) {
    	console.log("setup:",name,",prefix:",prefix + name + "/");
      paths[name] = folder[name].create(prefix + name + "/");
    };
  }
  return paths;
}; 

var normalizePath = function(prefix, path) {
  if(path != null && path.indexOf('@') > -1) {
    var preuri = path.substr(path.indexOf('@')+1).substr(prefix.length);
    path = preuri;
  }
  return path;
};

UnionFio.prototype.asView = function(path, viewfs) {
    if(path.substr(0,1) != "/") path = "/" + path;
    
    var subpos = path.indexOf("/", 1);
    var root = subpos > -1 ? path.substr(0,subpos) : path;
    var name = root.substr(1);
    console.log("asView", name, path);
    if(!(name in viewfs)) {
        return false;
    }
    var rootfs = viewfs[name];
    var subpath = subpos > -1 ? path.substr(subpos) : "/";
    return { name: name, base: rootfs , path: subpath }
};

UnionFio.prototype.onList = function(data) {
  var fio = this.fio;
  var o = data.data;
  var uri = normalizePath(this.prefix, o.path);
  var lsMime = ["Content-Type:application/json"];

  this.ls(uri, data, function(files, err) {
    fio.post(o.streamId, JSON.stringify(files), lsMime, data.shareId);
  });
};


UnionFio.prototype.ls = function(path, data, cb) {
	var self = this;

	var fio = this.fio;
	var prefix = this.prefix;
	var paths = this.fuse;
	var multicast = true;
	
	var out = [];
	if (path == "" || path.substr(0, 1) != "/")
		path = "/" + path;
	if (path == "" || path.substr(-1) != "/")
		path = path + "/";

	// NOTES: List from all mounts.
	if (multicast) {
		for ( var i in paths) {
			// self.onSubList(self.fio, paths[i], data);
			// FIXME: check if we want to send the list from all mounts in one time using cb() 
			var mount = paths[i];
			var uri = normalizePath(mount.prefix, data.data.path);
			console.log("mount ls ", uri, mount.prefix);
			mount.ls(uri, function(files, err) {
				if (err) {
					console.log("error listing files,", uri, err);
					return cb(null, err);
				}
				if (mount.meta)
					mount.meta(uri, files, function(files, err) {
						cb(files); //out.push(files);
					});
				else
					cb(files);// out.push(files);
			});
		}
		return;
	}

	if (path == "/") {
		var mounts = [];
		for ( var i in paths) {
			mounts.push(self.asFolder(path, {
				name : i,
				type : 1
			}));
		}
		cb(mounts);
	} else {

		var parts = this.asView(path, paths);
		if (!parts || !parts.base) {
			console.log("could not find path", path);
			return;
		}
		var mount = parts.base;
		if (mount.ls) {
			self.onSubList(self.fio, mount, data);
		} else {
			console.log("mount does not provide file lists", parts);
		}
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
UnionFio.prototype.cat = function(path,cb){
	var self = this;

	var prefix = this.prefix;
	var paths = this.fuse;
	var multicast = true;
	
	//NOTES: cat from all mounts.
	if (multicast) {
		for ( var i in paths) { 
			var mount = paths[i];
			var uri = normalizePath(mount.prefix, path);
			console.log("mount cat", uri, mount.prefix);
			
			mount.cat(uri, function(result, err) {
				if (err) {
					console.log("cat file error,", uri, err);
					return cb(null, err);
				}
				
				cb(result);
			});
		}
		return;
	}
	
	//FIXME add read from a specified fs of union folders.
	
}

/**
 * @param path, string, the path 
 * @param data, the input data, 'stream.Readable' or 'Buffer'
 * @param cb, the callback function
 */
UnionFio.prototype.write = function(path, data, cb) {
	var self = this;

	var prefix = this.prefix;
	var paths = this.fuse;
	var multicast = true;

	if (multicast) {
		for ( var i in paths) {
			var mount = paths[i];
			var uri = normalizePath(mount.prefix, path);
			console.log("mount write", uri, mount.prefix);

			var Readable = require('stream').Readable;

			// we first pause the stream from emitting data events
			if (data instanceof Readable) {
				data.pause();
			}

			// write buffer data or pipe the input stream to dest writable stream
			mount.write(uri, data, function(result, err) {
				if (err) {
					console.log("write file error ,", uri, err);
					return cb(null, err);
				}

				cb(result);
			});

			// after set all the dest stream, we resume the stream to pipe data.
			if (data instanceof Readable) {
				data.resume();
			}
		}
		return;
	}

	// FIXME add write to a specified fs of union folders.
}

UnionFio.prototype.asFolder = function(dir, file) {
  var o = { name: file.name };
  o.fullPath = dir + file.name;
  if(!o.meta) o.meta = {};
  o.uri = "#" + this.prefix + o.fullPath;
  o.size = file.size || 0;
  o.extension = "txt";
  o.type = "text/plain";
  if(file.type == '1') {
      o.extension = '+folder';
      o.type = "";
  }
  return o;
};

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
