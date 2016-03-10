/*
 *
 * Folders.io provider: in-memory file system.
 *
 */

var fs = require('fs');
var p = require('path');
// FIXME: Adapt BufferStream to handle arrays of buffer.
var BufferStream = require('./stream-buffer');

// virtual file system in memory
var fileSystem = {};

var MemoryFio = function(prefix) {
  this.prefix = prefix || "/http_window.io_0:memory/";
};
module.exports = MemoryFio;

MemoryFio.prototype.normalizePath = function(uri) {
  var prefix = this.prefix;
  var op = uri;
  if (uri != null && uri.indexOf('@') > -1) {
    var preuri = uri.substr(uri.indexOf('@') + 1).substr(prefix.length);
    uri = preuri;
  }
  var uri = p.resolve(p.normalize(uri || "."));
  return uri;
};

MemoryFio.prototype.cat = function(path, cb) {

  // FIXME: This method is repeated often and is fragile.
  var uri = this.normalizePath(path);

  cat(uri, cb);
};

MemoryFio.prototype.write = function(path, data, cb) {

  var uri = this.normalizePath(path);

  write(uri, data, cb);
};

MemoryFio.prototype.ls = function(path, cb) {
  var self = this;

  var uri = this.normalizePath(path);

  var files = [];
  var file;
  for ( var key in fileSystem) {
    if (p.dirname(key) === uri) {
      file = fileSystem[key];
      files.push({
        name : file.name,
        size : file.size,
        extension : '+folder',
        type : '',
        uri: file.uri,
        fullPath : file.uri,
        modificationTime : file.modificationTime
      });
    }
  }
  cb(null, files);
  // // FIXME: Not implemented yet.
  // fs.stat(uri, function(err, stats) {
  // if(err) {
  // return cb(err);
  // }
  // if(!stats.isDirectory()) {
  // var results = self.asFolders(uri, [stats]);
  // return cb(null, results);
  //      
  // }
  // fs.readdir(uri, function(err, files) {
  // var results = self.asFolders(uri, files);
  // cb(null, results);
  // });
  // });
};

MemoryFio.prototype.meta = function(uri, files, cb) {
  if (files === null) {
    return cb("files not found", null);
  }
  var latch = files.length;
  // TODO: Limit the number of active stat calls.
  for (var i = 0; i < files.length; i++) {
    (function(i) {
      fs.stat(p.resolve(uri, files[i].name), function(err, stats) {
        latch--;
        files[i].modificationTime = +stats.mtime;
        if (stats.isDirectory()) {
          files[i].extension = '+folder';
          files[i].type = "";
        } else {
          files[i].size = stats.size;
        }
        if (latch == 0) {
          cb(null, files);
        }
      })
    })(i);
  }
};

// Convert from a node.js readdir result to a folders.io record.
MemoryFio.prototype.asFolders = function(dir, files) {
  var out = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var o = {
      name : file
    };
    o.fullPath = p.relative('.', p.resolve(dir, o.name));
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
  if (!(uri in fileSystem)) {
    console.error("file not exsit");
    return cb("file not exsit", null);
  }

  var file = fileSystem[uri];
  console.log('cat file, name:', file.name, ', size:', file.size);
  cb(null, {
    stream : new BufferStream(null, fileSystem[uri].data),
    size : file.size,
    name : file.name
  });
};

var write = function(uri, data, cb) {
  // NOTES: uri could be setup to be a destination pipe, such as piped writable in Java
  // FIXME: This implementation can just be re-used from buffer-stream.
  var len = 0;
  var chunks = [];

  if (data instanceof Buffer) {
    len += chunk.length;
    chunks.push(data);
    fileSystem[uri] = {
      name : p.basename(uri),
      size : len,
      data : chunks,
      permission : '644',
      accessTime : (new Date()).getTime(),
      modificationTime : (new Date()).getTime(),
      type : 'FILE'
    };
    cb(null, "write uri success");
  } else {
    // Readable stream input
    data.on('data', function(chunk) {
      len += chunk.length;
      chunks.push(data);
    });
    data.on('error', function(e) {
      console.error("folders-memory, write error, ", uri);
      cb(e.message);
    });
    data.on('end', function() {
      fileSystem[uri] = {
        uri: uri,
        name : p.basename(uri),
        size : len,
        data : chunks,
        permission : '644',
        accessTime : (new Date()).getTime(),
        modificationTime : (new Date()).getTime(),
        type : 'FILE'
      };
      console.log("folders-memory, write end,", uri);
      cb(null, "write uri success");
    });
  }
};
