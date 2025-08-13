import minimatch from 'minimatch';
import util from 'util';
import cron from 'node-cron';
import async from 'async';
import Union from './union.js';
import Fio from './api.js';

const fio = new Fio();

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
 *   // number of maximum concurrent transfer threads, copy file.
 *   concurrency : 5,
 * 
 *   // TODO: Compare logic handler, may support different custom logic functions for LS/Cat ...
 *   // by default, we do subtraction which meaning only show the file in source but not in dest.
 *   logicHandler: resultFolders = function(sourceFolders, destFolders, options);
 * }
 * </pre>
 * 
 * 
 */
class FoldersSyncUnion {
  constructor(mounts, options, prefix) {
    prefix = prefix || '/http_folders.io_0:sync-union/';
    this.prefix = prefix;

    this.source = mounts.source;
    this.source.dir = normalizeDirPath(mounts.source.dir);
    this.source.provider = fio.provider(mounts.source.module, mounts.source.opts).create(prefix);
    this.destination = mounts.destination;
    this.destination.dir = normalizeDirPath(mounts.destination.dir);
    this.destination.provider = fio.provider(mounts.destination.module, mounts.destination.opts).create(prefix);

    this.options = options || {};
  }

  scheduleSync(cronTime) {
    const self = this;

    const jobId = cron.schedule(cronTime, function() {
      console.log('begin to execute sync job, ' + self.source.module + ':/' + self.source.dir + ' ==> '
          + self.destination.module + ':/' + self.destination.dir);
      self.sync(function(err, result) {
        if (err) {
          console.log('sync job execute error, ' + self.source.module + ':/' + self.source.dir + ' ==> '
              + self.destination.module + ':/' + self.destination.dir + '\n');
          console.log(err);
        } else {
          console.log('sync job execute success, ' + self.source.module + ':/' + self.source.dir + ' ==> '
              + self.destination.module + ':/' + self.destination.dir + '\n');
        }
      });
    }, null, self);

    return jobId;
  }

  cancelSync(jobId) {
    // how to cancel a job in node-cron?
    // the schedule method returns a task object that can be used to stop the task.
    jobId.stop();
  }

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
  sync(cb) {
    const self = this;
    const sourcePath = this.source.dir;
    const destinationPath = this.destination.dir;
    const options = this.options;

    const today = new Date().toISOString().slice(0, 10);
    const destinationDir = destinationPath + today + '/';

    if (!self.destination.provider.mkdir) {
      return cb('destination Provider do not support mkDir feature');
    }

    console.log('destination Provider mkDir starting...,', destinationDir);
    self.destination.provider.mkdir(destinationDir, function(err, result) {
      if (err) {
        return cb('destination Provider mkDir error');
      }

      console.log('destination Provider mkDir successful,', destinationDir);
      console.log('comparing source/destination Folder...,');
      self.compareFolder(sourcePath, destinationPath, options, function(err, syncList) {
        if (err) {
          return cb(err, null);
        }

        if (syncList.length <= 0) {
          console.log('file list is same, no file need to sync');
          return cb(null, syncList);
        }
        console.log('compare source/destination Folder finished, ' + syncList.length + ' files to sync');

        if (!options.concurrency || options.concurrency < 1) {
          options.concurrency = syncList.length;
        }

        syncFiles(self, syncList, destinationDir, options.concurrency, cb);
      });
    });
  }

  // cp single file from source to destination
  cp(sourceUri, destinationUri, cb) {
    const self = this;

    self.source.provider.cat(sourceUri, function(err, source_r) {
      if (err) {
        console.log("error occured in union cp(), reading source error, ", err);
        return cb(err);
      }
      const file = source_r.stream;
      self.destination.provider.write(destinationUri, file, function(err) {
        if (err) {
          console.log("error occured in union cp(), writing to destination err, ", err);
          return cb(err);
        }
        cb(null, 'cp success');
      });
    });
  }

  ls(cb) {
    const self = this;
    const sourcePath = this.source.dir;
    const destinationPath = this.destination.dir;
    const options = this.options;

    self.compareFolder(sourcePath, destinationPath, options, function(err, result) {
      if (err) {
        return cb(err, null);
      }
      return cb(null, result);
    });
  }

  projection(folders, filter) {
    const result = [];
    for (let i = 0; i < folders.length; i++) {
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

  lsR(provider, uri, filter, cb) {
    const self = this;
    let folders = [];

    const done = function(err) {
      if (err)
        return cb(err);
      cb(null, folders);
    }

    provider.ls(uri, function(err, data) {
      if (err)
        return cb(err);

      let i = -1;

      (function next() {
        i++;
        if (i >= data.length)
          return done(null, folders);

        if (data[i].extension == '+folder') {
          self.lsR(provider, data[i].fullPath, filter, function(err, subFolders) {
            if (err)
              return done(err);
            folders = folders.concat(subFolders);
            next();
          });
        } else {
          if (!filter || match(data[i].name, filter)) {
            folders.push(data[i]);
          }
          next();
        }
      })();
    });
  }

  compareFolder(sourcePath, destinationPath, options, cb) {
    const self = this;

    self.lsR(self.source.provider, sourcePath, options.filter, function(error, source) {
      if (error) {
        return cb('ls source path error,' + error, null);
      }

      self.lsR(self.destination.provider, destinationPath, options.filter, function(error, destination) {
        if (error) {
          return cb('ls destination path error,' + error, null);
        }

        if (!options.logicHandler)
          cb(null, self.foldersSubtraction(sourcePath, source, destinationPath, destination, options));
        else if (typeof (options.logic) == 'function')
          cb(null, options.logicHandler(source, destination, options));
        else
          cb('error logic handler, not a function.');
      });
    });
  }

  foldersSubtraction(sourcePath, source, destinationPath, destination, options) {
    const self = this;
    const syncList = [];
    let ifExist = false;
    for (let i = 0; i < source.length; i++) {
      ifExist = false;
      for (let j = 0; j < destination.length; j++) {
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

  compareFile(sourcePath, source, destinationPath, destination, options) {
    const ignoreCase = options.ignoreCase || false;
    const compareSize = options.compareSize || false;
    const ignoreDirPath = options.ignoreDirPath || false;

    if (compareSize) {
      if (source.size != destination.size)
        return false;
    }

    let sourceName = source.name;
    let destName = destination.name;
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
}

const syncFiles = function(self, syncList, destinationDir, concurrency, cb) {

  const sourcePath = self.source.dir;
  const destinationPath = self.destination.dir;

  console.log('begin to sync files, concurrency:' + concurrency);
  const syncResult = [];
  const cpFileTasker = function(fileIdx, callback) {

    const file = syncList[fileIdx];

    const syncInfo = self.source.module + ':/' + file.uri + ' ==> ' + self.destination.module + ':/' + destinationDir
        + file.name;
    console.log('sync #' + (fileIdx + 1) + '/' + syncList.length + ' file... ', syncInfo);

    self.cp(file.uri, destinationDir + file.name, function(err, result) {
      if (err) {
        console.log('sync #' + (fileIdx + 1) + '/' + syncList.length + ' file error ', err);
      } else {
        console.log('sync #' + (fileIdx + 1) + '/' + syncList.length + ' file finished');
        syncResult.push(syncInfo);
      }
      callback(err);
    });
  }

  const q = async.queue(cpFileTasker, concurrency);

  q.drain = function() {
    console.log('sync finished, sync ' + syncList.length + ' file(s) in total');
    cb(null, syncResult);
  }

  const cpErrorHandler = function(err) {
    if (err) {
      console.log('sync file error, ', err);
      q.kill();
      cb(err);
    }
  }

  for (let i = 0; i < syncList.length; i++) {
    q.push(i, cpErrorHandler);
  }
}

const match = function(fileName, pattern) {
  const patternArray = pattern.split(',');
  for (let i = 0; i < patternArray.length; i++) {
    const pat = patternArray[i];
    if (minimatch(fileName, pat, {
      dot : true
    })) {
      return true;
    }
  }
  return false;
}

const getRelativePath = function(fullPath, basePath) {
  if (fullPath && fullPath.length > 0 && fullPath[0] != '/') {
    fullPath = '/' + fullPath;
  }

  const idx = fullPath.indexOf(basePath);
  if (idx < 0) {
    console.error('full path wrong, can not parse relative path');
    return fullPath;
  }

  return fullPath.substr(idx + basePath.length);
}

const normalizeDirPath = function(dir) {
  if (!dir || dir == '')
    dir = '/';
  if (dir[dir.length - 1] != '/')
    dir = dir + '/';
  if (dir[0] != '/')
    dir = '/' + dir;
  return dir;
}

export default FoldersSyncUnion;
