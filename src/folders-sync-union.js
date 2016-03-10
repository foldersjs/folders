var minimatch = require('minimatch');
var util = require('util');
var Union = require('./union.js');

var FoldersSyncUnion = function(fio, mounts, opts, prefix) {
  Union.call(this, fio, mounts, opts, prefix);
}

// NOTE, a sub of Union folders
util.inherits(FoldersSyncUnion, Union);

module.exports = FoldersSyncUnion;

/**
 * Sync files from source dir path to destination dir Path
 * 
 * @param sourcePath:
 *          the source dir path
 * 
 * @param destinationPath:
 *          the destination dir path
 * 
 * @param Options:
 *          <ul>
 *          <li> filter: the filename regex filter, the regex for filter the file in source/destination, Default to null
 *          which not filter any file</li>
 *          <li> ignoreCase: Ignores case when comparing names. Defaults to 'false'.</li>
 *          <li> compareSize: Compare the file size as well</li>
 *          <li> threadNum: number of maximum concurrent transfer threads to copy</li>
 *          </ul>
 * @param cb
 *          cb(err, syncList);
 *          <ul>
 *          <li>err: if any error in the sync progress. syncList,</li>
 *          <li>syncList: if success, specify the files list we have sync</li>
 *          </ul>
 */

FoldersSyncUnion.prototype.sync = function(sourcePath, destinationPath, options, cb) {
  var self = this;

  if (sourcePath && sourcePath.length > 0 && sourcePath[sourcePath.length - 1] != '/')
    sourcePath = sourcePath + '/';
  if (destinationPath && destinationPath.length > 0 && destinationPath[destinationPath.length - 1] != '/')
    destinationPath = destinationPath + '/';

  var today = new Date().toISOString().slice(0, 10);// .replace(/-/g,"");
  // TODO need the folder to support CREATE_FOLDER operation.
  // create a data sub-folders in destination folder
  // var destinationDir = destinationPath + today + '/';
  var destinationDir = destinationPath;

  // FIXME, may ls the source/destination concurrently.
  self.ls(sourcePath, function(error, source) {
    if (error) {
      return cb('ls source path error,' + error, null);
    }

    self.ls(destinationPath, function(err, destination) {
      if (error) {
        return cb('ls destination path error,' + error, null);
      }

      // filter the folders by option.filter, only looks at file names that match a pattern
      // Compare the source folder and destination folder by name ( may and size)
      var syncList = self.compareFolder(source, destination, options);
      if (syncList.length <= 0) {
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

        syncResult.push(syncList[fileCounter].uri + ' ==> ' + destinationDir + syncList[fileCounter].name);
        fileCounter++;

        if (fileCounter < syncList.length) {
          console.log('sync #' + (fileCounter + 1) + ' file, ', syncList[fileCounter].name);
          self.cp(syncList[fileCounter].uri, destinationDir + syncList[fileCounter].name, function(err, result) {
          });
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

/**
 * projection folders by the specified filter.
 * 
 * @param folders:
 *          the folders array to filter
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



/**
 * Compare folder. Compare all files in folders.
 * 
 * @param source ,
 *          source folders, a file metadata array.
 * @param destination,
 *          destination folders, a file metadata array.
 * @options compare options,
 * 
 * return all the files that in source folders but not in destination folders
 */
// FIXME do we want to compare sub-folders?
// if yes, do we want to apply the filter to the sub-folders ?
FoldersSyncUnion.prototype.compareFolder = function(source, destination, options) {

  if (options.filter) {
    source = this.projection(source, options.filter);
    destination = this.projection(destination, options.filter);
  }

  var syncList = [];
  var ifExist = false;
  for (var i = 0; i < source.length; i++) {
    ifExist = false;
    for (var j = 0; j < destination.length; j++) {
      if (compareFile(source[i], destination[j], options)) {
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
 * @param source:
 *          source file metadata,
 * @param destination:
 *          destination file metadata.
 * 
 * @param options:
 *          file compare options args,
 *          <ul>
 *          <li>options.ignoreCase, Ignores case when comparing names. Defaults to 'false'.</li>
 *          <li>options.compareSize, Compare the file size as well.</li>
 *          </ul>
 */
// FIXME may also use other metadata options (eg, date..) to compare
var compareFile = function(source, destination, options) {
  var ignoreCase = options.ignoreCase || false;
  var compareSize = options.compareSize || false;

  if (ignoreCase == false || compareSize == false) {
    return source.name == destination.name;
  } else if (ignoreCase == true || compareSize == false) {
    return source.name.toLowerCase() == destination.name.toLowerCase();
  } else if (ignoreCase == false || compareSize == true) {
    return source.name == destination.name && source.size == destination.size;
  } else {
    return source.name.toLowerCase() == destination.name.toLowerCase() && source.size == destination.size;
  }
}