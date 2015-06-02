/*
 *
 * Folders.io provider: share the local file system.
 *
 */

var fs = require('fs');
var path = require('path');

var LocalFio = function(fio, prefix) {
  this.fio = fio;
  this.prefix = prefix || "/http_window.io_0:local/";
};
module.exports = LocalFio;

LocalFio.prototype.normalizePath = function(uri) {
  var prefix = this.prefix;
  var op = uri;
  if(uri != null && uri.indexOf('@') > -1) {
    var preuri = uri.substr(uri.indexOf('@')+1).substr(prefix.length);
    uri = preuri;
  }
  console.log({prefix: prefix, op: op, path: uri, pre: preuri});
  var uri = path.resolve(path.normalize(uri || "."));
  return uri;
};

LocalFio.prototype.cat = function(path, cb) {

  // FIXME: This method is repeated often and is fragile.
  var uri = this.normalizePath(path);

  cat(uri, function(result, err) {
  	if (err){
  		console.error("error in folders-local cat,",err);
  		return cb(null, err);
  	}
  	
  	cb(result);
  	
//    var headers = {
//      "Content-Length": result.size,
//      "Content-Type": "application/octet-stream",
//      "X-File-Type": "application/octet-stream",
//      "X-File-Size": result.size,
//      "X-File-Name": result.name
//    };
//    cb({streamId: o.streamId, data: result.stream, headers: headers, shareId: data.shareId });
  });
};

LocalFio.prototype.write = function(uri, data, cb) {

	write(uri, data, function(result, err) {
		if (err){
  		console.error("error in folders-local write,",err);
  		return cb(null, err);
  	}
		
		cb(result);
	});
};

LocalFio.prototype.ls = function(uri, cb) {
  var self = this;

  uri = path.resolve(path.normalize(uri || "."));

  fs.stat(uri, function(err, stats) {
    if(err) {
    	console.error("error in folders-local ls,", err);
    	return cb(null, err);
    }
    if(!stats.isDirectory()) {
      var results = self.asFolders(uri, [stats]);
      return cb(results);
    }
    fs.readdir(uri, function(err, files) {
      var results = self.asFolders(uri, files);
      cb(results);
    });
  });
};

LocalFio.prototype.meta = function(uri, files, cb) {
  if(files === null) { cb(null, "files not found"); return; }
  var latch = files.length;
  // TODO: Limit the number of active stat calls.
  for(var i = 0; i < files.length; i++) {
    (function(i) {
    fs.stat(path.resolve(uri, files[i].name), function(err, stats) {
      latch--;
      files[i].modificationTime = +stats.mtime;
      if(stats.isDirectory()) {
        files[i].extension = '+folder';
        files[i].type = "";
      } else {
        files[i].size = stats.size;
      }
      if(latch == 0) {
        cb(files);
      }
      // else console.log("progress " + latch);
    })})(i);
  }
};

// Convert from a node.js readdir result to a folders.io record.
LocalFio.prototype.asFolders = function(dir, files) {
  var out = [];
  for(var i = 0; i < files.length; i ++) {
    var file = files[i];
    var o = { name: file };
    o.fullPath = path.relative('.', path.resolve(dir, o.name));
    o.uri = "#" + this.prefix + o.fullPath;
    o.size = 0;
    o.extension = "txt";
    o.type = "text/plain";
    o.modificationTime = +new Date();
    out.push(o);
  }
  return out;
};

var cat = function(uri, cb) {
  fs.stat(uri, function(err, stats) {
    if(err) {
    	console.error("error in folders-local cat,",err);
    	return cb(null, err);
    }
    if(stats.isDirectory()) {
    	return cb(null, "refused to cat directory");
    }
    var size = stats.size;
    var name = path.basename(uri);
    try {
      var file = fs.createReadStream(uri).on('open', function() {
        cb({stream: file, size: size, name: name});
      });
    } catch(e) {
    	console.error("error in createReadStream,",e);
      cb(null, "unable to read uri");
    }
  });
};

var write = function(uri, data, cb) {
	try {
		var file = fs.createWriteStream(uri);
		
		if (data instanceof Buffer){
			file.write(data, function() {
				file.end(function() {
					cb("write uri success");
				});
			});
		}else{
			var errHandle = function(e){
				cb(null,e.message);
			};
			//stream source input, use pipe
			data.on('error',errHandle)
				.pipe(file)
				.on('error',errHandle)
				.on('end', function() {cb("write uri success");});
		}
	} catch (e) {
		console.error("error in createWriteStream,",e);
		cb(null, "unable to write uri");
	}
}
