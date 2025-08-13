/*
 *
 * Folders.io provider: in-memory file system.
 *
 */

import fs from 'fs';
import p from 'path';
import BufferStream from './stream-buffer.js';

// virtual file system in memory
const fileSystem = {};

class MemoryFio {
  constructor(prefix) {
    this.prefix = prefix || "/http_window.io_0:memory/";
  }

  normalizePath(uri) {
    const prefix = this.prefix;
    if (uri != null && uri.indexOf('@') > -1) {
      uri = uri.substr(uri.indexOf('@') + 1).substr(prefix.length);
    }
    uri = p.resolve(p.normalize(uri || "."));
    return uri;
  }

  cat(path, cb) {
    const uri = this.normalizePath(path);
    cat(uri, cb);
  }

  write(path, data, cb) {
    const uri = this.normalizePath(path);
    write(uri, data, cb);
  }

  mkdir(path, cb) {
    // FIXME: MAY create a empty folders
    cb(null,'create folder success');
  }

  ls(path, cb) {
    const uri = this.normalizePath(path);
    const files = [];
    for (const key in fileSystem) {
      if (p.dirname(key) === uri) {
        const file = fileSystem[key];
        files.push({
          name : file.name,
          size : file.size,
          extension : file.type != 'FILE' ? '+folder' : '',
          type : '',
          uri: file.uri,
          fullPath : file.uri,
          modificationTime : file.modificationTime
        });
      }
    }
    cb(null, files);
  }

  meta(uri, files, cb) {
    if (files === null) {
      return cb("files not found", null);
    }
    let latch = files.length;
    for (let i = 0; i < files.length; i++) {
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
  }

  asFolders(dir, files) {
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const o = {
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
  }
}

const cat = function(uri, cb) {
  if (!(uri in fileSystem)) {
    console.error("file not exsit");
    return cb("file not exsit", null);
  }

  const file = fileSystem[uri];
  console.log('cat file, name:', file.name, ', size:', file.size);
  cb(null, {
    stream : new BufferStream(null, fileSystem[uri].data),
    size : file.size,
    name : file.name
  });
};

const write = function(uri, data, cb) {
  let len = 0;
  const chunks = [];

  if (data instanceof Buffer) {
    len += data.length;
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
    data.on('data', function(chunk) {
      len += chunk.length;
      chunks.push(chunk);
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

export default MemoryFio;
