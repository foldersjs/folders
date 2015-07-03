/*
 *
 * Folders.io provider: share the local file system.
 *
 */

var fs = require('fs');
var path = require('path');

var LocalFio = function(prefix) {
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
  console.log("normalizePath in folders-local,\n",{prefix: prefix, op: op, path: uri/*, pre: preuri*/});
  var uri = path.resolve(path.normalize(uri || "."));
  return uri;
};

LocalFio.prototype.cat = function(path, cb) {

  // FIXME: This method is repeated often and is fragile.
  var uri = this.normalizePath(path);

  //return fs.createReadStream(uri)
  
  cat(uri, function(result, err) {
  	if (err){
  		console.error("error in folders-local cat,",err);
  		return cb(err, null);
  	}

  	cb(null,result);
  	
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
	var uri = this.normalizePath(uri);

	write(uri, data, function(result, err) {
		if (err) {
			console.error("error in folders-local write,",err);
			return cb(err,null);
		}
		cb(null,result);
	});
};


LocalFio.prototype.ls = function(uri, cb) {
  var self = this;

  var uri = this.normalizePath(uri);

  fs.stat(uri, function(err, stats) {
    if(err) {
    	console.error("error in folders-local ls,", err);
    	return cb(err,null);
    }
    if(!stats.isDirectory()) {
      var results = self.asFolders(uri, [stats]);
      return cb(null,results);
    }
    fs.readdir(uri, function(err, files) {
      var results = self.asFolders(uri, files);
      cb(null,results);
    });
  });
};

LocalFio.prototype.meta = function(uri, files, cb) {
  if(files === null) { cb( "files not found",null); return; }
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
        cb(null,files);
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
    	return cb(err,null);
    }
    if(stats.isDirectory()) {
    	return cb("refused to cat directory",null);
    }
    var size = stats.size;
    var name = path.basename(uri);
    try {
      var file = fs.createReadStream(uri).on('open', function() {
        cb(null,{stream: file, size: size, name: name});
      });
    } catch(e) {
    	console.error("error in createReadStream,",e);
      cb("unable to read uri",null);
    }
  });
};

var write = function(uri, data, cb) {
	try {
		var file = fs.createWriteStream(uri);
		
		if (data instanceof Buffer){
			file.write(data, function() {
				file.end(function() {
					cb(null,"write uri success");
				});
			});
/*
		} else {
			var errHandle = function(e) {
				console.log("error in pipe write ");
				cb(null, e.message);
			};
			// stream source input, use pipe
			data.on('error', errHandle).pipe(file).on('error', errHandle);

			data.on('end', function() {
				file.end();
				cb("write uri success");
			});
*/

		} else {
			data.destroySoon = function() {
			    file.destroySoon();
			}

			file.on('close',function(){
				data.emit('close');
		
			});
			
			file.on('open',function(fd) {
				data.emit('open',fd);
			})

			var errHandle = function(e) {
				cb(e.message,null);
			};
			//stream source input, use pipe
			data.on('error',errHandle)
				.pipe(file)
				.on('error',errHandle)
				.on('end', function() {cb(null,"write uri success");});
		}
	} catch (e) {
		console.error("error in createWriteStream,",e);
		cb("unable to write uri",null);
	}
}
