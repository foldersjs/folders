var minimatch = require('minimatch');
var util = require('util');
var Union = require('./union');
var Fio = require('./api');

var fio = new Fio();

/**
 * Sync Union Folders constructor
 * 
 * @param mounts,
 *          the source/dest provider informations.
 * 
 * <pre>
 * // example to sync file from root of STUB to root of HDSF folders
 * {
 *   // the source information
 *   source : {
 *     module : 'stub',
 *     opts : null,
 *     dir : '/'
 *   },
 *   // the destination information
 *   destination : {
 *     module : 'hdfs', // module name
 *     // options for init module
 *     opts : {
 *       baseurl : 'webhdfs-url',
 *       username : 'webhdfs-username'
 *     },
 *     // the dir used to sync file
 *     dir : '/'
 *   }
 * }
 * </pre>
 * 
 * @param options
 * 
 * Sync Options:
 * 
 * <pre>
 * {
 * 
 *   // filter: the filename regex filter, the regex for filter the file in source/dest,
 *   // Default to null which not filter any file
 *   filter : '*.txt',
 * 
 *   // if Ignore case of file name when compare file, default false;
 *   ignoreCase : false,
 * 
 *   // if Compare size when compare file, default false;
 *   compareSize : false
 *  
 *   // when Compare files in subfolders (sub dir), we compare the full path include the dir or just the file name
 *   ignoreDirPath: false;
 * 
 *   // TODO: Thread number used for copy file.
 *   threadNum : 5,
 * 
 *   // TODO: Compare logic handler, may support different custom logic functions for LS/Cat ...
 *   // by default, we do subtraction which meaning only show the file in source but not in dest.
 *   logicHandler: resultFolders = function(sourceFolders, destFolders, options);
 * }
 * </pre>
 * 
 * 
 */
var FoldersSyncUnion = function(mounts, options, prefix) {

  prefix = prefix || '/http_folders.io_0:sync-union/';
  this.prefix = prefix;

  // NOTES, Directly use the origin folders to instead of Union folders.
  // // The source and dest mounts used to init Union.js
  // var sourceMount = {}, destMount = {};
  // sourceMount[mounts.source.module] = fio.provider(mounts.source.module, mounts.source.opts);
  // destMount[mounts.destination.module] = fio.provider(mounts.destination.module, mounts.destination.opts);
  // var unionMounts = [ sourceMount, destMount ];
  // // a special union folders with two provider (source/dest)
  // this.union = new Union(fio, unionMounts, null, prefix);
  // this.sourceDir = normalizeDirPath(mounts.source.module, mounts.source.dir);
  // this.destinationDir = normalizeDirPath(mounts.destination.module, mounts.destination.dir);

  this.source = mounts.source;
  this.source.dir = normalizeDirPath(mounts.source.dir);
  this.source.provider = fio.provider(mounts.source.module, mounts.source.opts).create(prefix);
  this.destination = mounts.destination;
  this.destination.dir = normalizeDirPath(mounts.destination.dir);
  this.destination.provider = fio.provider(mounts.destination.module, mounts.destination.opts).create(prefix);

  this.options = options || {};
}

module.exports = FoldersSyncUnion;

/**
 * Sync files from source dir path to destination dir Path
 * 
 * @param cb
 *          cb(err, syncList);
 *          <ul>
 *          <li>err: if any error in the sync progress. syncList,</li>
 *          <li>syncList: if success, specify the files list we have sync</li>
 *          </ul>
 */

FoldersSyncUnion.prototype.sync = function(cb) {
  var self = this;
  var sourcePath = this.source.dir;
  var destinationPath = this.destination.dir;
  var options = this.options;

  var today = new Date().toISOString().slice(0, 10);// .replace(/-/g,"");
  var destinationDir = destinationPath + today + '/';

  if (!self.destination.provider.mkdir) {
    return cb('destination Provider do not support mkDir feature');
  }

  self.destination.provider.mkdir(destinationDir, function(err, result) {
    if (err) {
      return cb('destination Provider mkDir error');
    }

    console.log('destination Provider mkDir successful,', destinationDir);

    // filter the folders by option.filter, only looks at file names that match a pattern
    // Compare the source folder and destination folder by name ( may and size)
    self.compareFolder(sourcePath, destinationPath, options, function(err, syncList) {
      if (err) {
        return cb(err, null);
      }

      if (syncList.length <= 0) {
        console.log('file list is same, no file need to sync');
        return cb(null, syncList);
      }

      // Copy the Files in syncList, from source to dest.
      // FIXME, need to support copy files concurrently using multi-thread, threadNum to set number of maximum
      // concurrent transfer threads.
      var fileCounter = 0; // syncList.length;
      var syncResult = [];
      var cpFileCb = function(err, result) {

        if (err) {
          return cb('cp file error,' + syncList[fileCounter].path, null);
        }

        syncResult.push(self.source.module + ':/' + syncList[fileCounter].uri + ' ==> ' + self.destination.module
            + ':/' + destinationDir + syncList[fileCounter].name);
        fileCounter++;

        if (fileCounter < syncList.length) {
          console.log('sync #' + (fileCounter + 1) + ' file, ', syncList[fileCounter].name);
          self.cp(syncList[fileCounter].uri, destinationDir + syncList[fileCounter].name, cpFileCb);
        } else {
          console.log('sync finished, sync ' + syncList.length + ' file(s) in total');
          cb(null, syncResult); // copy finished
        }
      }
      console.log('sync #' + (fileCounter + 1) + ' file, ', syncList[fileCounter].name);
      self.cp(syncList[fileCounter].uri, destinationDir + syncList[fileCounter].name, cpFileCb);

    });
  });

}

// cp single file from source to destination
FoldersSyncUnion.prototype.cp = function(sourceUri, destinationUri, cb) {
  var self = this;

  self.source.provider.cat(sourceUri, function(err, source_r) {
    if (err) {
      console.log("error occured in union cp(), reading source error, ", err);
      return cb(err);
    }
    var file = source_r.stream;
    self.destination.provider.write(destinationUri, file, function(err) {
      if (err) {
        console.log("error occured in union cp(), writing to destination err, ", err);
        return cb(err);
      }
      cb(null, 'cp success');
    });
  });
};

/**
 * Ls the files in Sync Union
 * 
 * by default, SyncUnion will ls the subtraction of source - destinationPath
 */
FoldersSyncUnion.prototype.ls = function(cb) {
  var union = this.union;
  var self = this;
  var sourcePath = this.source.dir;
  var destinationPath = this.destination.dir;
  var options = this.options;

  self.compareFolder(sourcePath, destinationPath, options, function(err, result) {
    if (err) {
      return cb(err, null);
    }

    return cb(null, result);
  });
}

/**
 * projection folders by the specified filter.
 * 
 * @param folders:
 *          the folders array to filter
 * @filter: the filter used for filter file
 * 
 */
FoldersSyncUnion.prototype.projection = function(folders, filter) {

  var result = [];
  for (var i = 0; i < folders.length; i++) {
    if (folders[i].extension == '+folder') {
      // FIXME, filter folders?
    } else {
      if (match(folders[i].name, filter)) {
        result.push(folders[i]);
      }
    }
  }
  return result;
}

// use the minimatch lib to match name
var match = function(fileName, pattern) {
  var patternArray = pattern.split(',');
  for (var i = 0; i < patternArray.length; i++) {
    var pat = patternArray[i];
    if (minimatch(fileName, pat, {
      dot : true
    })) { // nocase
      return true;
    }
  }
  return false;
}

// Recursively list subdirectories encountered.
FoldersSyncUnion.prototype.lsR = function(provider, uri, filter, cb) {

  var self = this;
  var folders = [];

  var done = function(err) {
    if (err)
      return cb(err);
    cb(null, folders);
  }

  provider.ls(uri, function(err, data) {
    if (err)
      return cb(err);

    var i = -1;

    // FIXME May want to concurrently async ls sub-folders
    (function next() {
      i++;
      if (i >= data.length)
        return done(null, folders);

      // depth first walk method, if encountered dir, Recursively list subdirectories
      if (data[i].extension == '+folder') {
        self.lsR(provider, data[i].fullPath, filter, function(err, subFolders) {
          if (err)
            return done(err);
          folders = folders.concat(subFolders);
          next();
        });
      } else {
        // if it's file, filter by file name
        if (!filter || match(data[i].name, filter)) {
          folders.push(data[i]);
        }
        next();

      }
    })();
  });
}

/**
 * Compare folder. Compare all files in folders.
 * 
 * @param source ,
 *          source dir path
 * @param destination,
 *          destination dir path
 * @options compare options,
 * 
 * return all the files that in source folders but not in destination folders
 */
// FIXME do we want to compare sub-folders?
// if yes, do we want to apply the filter to the sub-folders ?
FoldersSyncUnion.prototype.compareFolder = function(sourcePath, destinationPath, options, cb) {
  var union = this.union;
  var self = this;
  var sourcePath = this.source.dir;
  var destinationPath = this.destination.dir;

  // FIXME, may ls the source/destination concurrently.
  self.lsR(self.source.provider, sourcePath, options.filter, function(error, source) {
    // union.ls(sourcePath, function(error, source) {
    if (error) {
      return cb('ls source path error,' + error, null);
    }

    self.lsR(self.destination.provider, destinationPath, options.filter, function(error, destination) {
      // union.ls(destinationPath, function(err, destination) {
      if (error) {
        return cb('ls destination path error,' + error, null);
      }
      // if (options.filter) {
      // source = self.projection(source, options.filter);
      // destination = self.projection(destination, options.filter);
      // }

      if (!options.logic)
        cb(null, self.foldersSubtraction(sourcePath, source, destinationPath, destination, options));
      else if (typeof (options.logic) == 'function')
        cb(null, options.logic(source, destination, options));
      else
        cb('error logic handler, not a function.');

    });
  });
}

FoldersSyncUnion.prototype.foldersSubtraction = function(sourcePath, source, destinationPath, destination, options) {
  var self = this;
  var syncList = [];
  var ifExist = false;
  for (var i = 0; i < source.length; i++) {
    ifExist = false;
    for (var j = 0; j < destination.length; j++) {
      if (self.compareFile(sourcePath, source[i], destinationPath, destination[j], options)) {
        ifExist = true;
        break;
      }
    }
    if (!ifExist) {
      syncList.push(source[i]);
    }
  }

  return syncList;
}

/**
 * Copmare two file, may compare file name, size.
 * 
 * @param sourcePath,
 *          the base path of source
 * @param source:
 *          source folder, source file metadata,
 * @param destination:
 *          the base path of destination
 * @param destination:
 *          destination folder, destination file metadata.
 * 
 * @param options:
 *          file compare options args,
 *          <ul>
 *          <li>options.ignoreCase, Ignores case when comparing names. Defaults to 'false'.</li>
 *          <li>options.compareSize, Compare the file size as well.</li>
 *          <li>options.ignoreDirPath, when compare files in sub folder, ignore dir path or not(true means we only
 *          compare file name)</li>
 *          </ul>
 */
// FIXME may also use other metadata options (eg, date..) to compare
FoldersSyncUnion.prototype.compareFile = function(sourcePath, source, destinationPath, destination, options) {

  var ignoreCase = options.ignoreCase || false;
  var compareSize = options.compareSize || false;
  var ignoreDirPath = options.ignoreDirPath || false;

  if (compareSize) {
    if (source.size != destination.size)
      return false;
  }

  var sourceName = source.name;
  var destName = destination.name;
  // when ignoreDirPath is false, we need to compare the whole relative path(dir path + file name)
  if (!ignoreDirPath) {
    sourceName = getRelativePath(source.fullPath, sourcePath);
    destName = getRelativePath(destination.fullPath, destinationPath);
  }

  if (ignoreCase) {
    sourceName = sourceName.toLowerCase();
    destName = destName.toLowerCase();
  }

  return sourceName == destName;

}

var getRelativePath = function(fullPath, basePath) {
  // add a leading '/' if not exist
  if (fullPath && fullPath.length > 0 && fullPath[0] != '/') {
    fullPath = '/' + fullPath;
  }

  var idx = fullPath.indexOf(basePath);
  if (idx < 0) {
    console.error('full path wrong, can not parse relative path');
    return fullPath;
  }

  return fullPath.substr(idx + basePath.length);
}

var normalizeDirPath = function(dir) {
  if (!dir || dir == '')
    dir = '/';
  if (dir[dir.length - 1] != '/')
    dir = dir + '/';
  if (dir[0] != '/')
    dir = '/' + dir;
  // dir = '/' + module + dir;
  return dir;

}
