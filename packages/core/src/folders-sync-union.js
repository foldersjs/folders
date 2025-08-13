import * as minimatch from 'minimatch';
import util from 'util';
import cron from 'node-cron';
import async from 'async';
import Union from './union.js';
import Fio from './api.js';

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
    this.destination = mounts.destination;
    this.options = options || {};
  }

  static async create(mounts, options, prefix) {
    const syncUnion = new FoldersSyncUnion(mounts, options, prefix);
    const fio = new Fio();
    syncUnion.source.dir = normalizeDirPath(mounts.source.dir);
    syncUnion.source.provider = await fio.provider(mounts.source.module, mounts.source.opts).create(prefix);
    syncUnion.destination.dir = normalizeDirPath(mounts.destination.dir);
    syncUnion.destination.provider = await fio.provider(mounts.destination.module, mounts.destination.opts).create(prefix);
    return syncUnion;
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
  async sync() {
    const sourcePath = this.source.dir;
    const destinationPath = this.destination.dir;
    const options = this.options;

    const today = new Date().toISOString().slice(0, 10);
    const destinationDir = destinationPath + today + '/';

    if (!this.destination.provider.mkdir) {
      throw new Error('destination Provider do not support mkDir feature');
    }

    console.log('destination Provider mkDir starting...,', destinationDir);
    try {
      await util.promisify(this.destination.provider.mkdir).bind(this.destination.provider)(destinationDir);
    } catch (err) {
      throw new Error('destination Provider mkDir error');
    }

    console.log('destination Provider mkDir successful,', destinationDir);
    console.log('comparing source/destination Folder...,');
    const syncList = await this.compareFolder(sourcePath, destinationPath, options);

    if (syncList.length <= 0) {
      console.log('file list is same, no file need to sync');
      return syncList;
    }
    console.log('compare source/destination Folder finished, ' + syncList.length + ' files to sync');

    if (!options.concurrency || options.concurrency < 1) {
      options.concurrency = syncList.length;
    }

    return syncFiles(this, syncList, destinationDir, options.concurrency);
  }

  // cp single file from source to destination
  async cp(sourceUri, destinationUri) {
    try {
      const source_r = await util.promisify(this.source.provider.cat).bind(this.source.provider)(sourceUri);
      const file = source_r.stream;
      await util.promisify(this.destination.provider.write).bind(this.destination.provider)(destinationUri, file);
      return 'cp success';
    } catch (err) {
      console.log("error occured in union cp(), ", err);
      throw err;
    }
  }

  async ls() {
    const sourcePath = this.source.dir;
    const destinationPath = this.destination.dir;
    const options = this.options;

    return this.compareFolder(sourcePath, destinationPath, options);
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

  async lsR(provider, uri, filter) {
    let folders = [];
    const data = await util.promisify(provider.ls).bind(provider)(uri);

    for (const item of data) {
      if (item.extension === '+folder') {
        const subFolders = await this.lsR(provider, item.fullPath, filter);
        folders = folders.concat(subFolders);
      } else {
        if (!filter || match(item.name, filter)) {
          folders.push(item);
        }
      }
    }
    return folders;
  }

  async compareFolder(sourcePath, destinationPath, options) {
    try {
      const source = await this.lsR(this.source.provider, sourcePath, options.filter);
      const destination = await this.lsR(this.destination.provider, destinationPath, options.filter);

      if (!options.logicHandler) {
        return this.foldersSubtraction(sourcePath, source, destinationPath, destination, options);
      } else if (typeof options.logic === 'function') {
        return options.logicHandler(source, destination, options);
      } else {
        throw new Error('error logic handler, not a function.');
      }
    } catch (error) {
      if (error.message.includes('source')) {
        throw new Error('ls source path error,' + error);
      } else {
        throw new Error('ls destination path error,' + error);
      }
    }
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

const syncFiles = (self, syncList, destinationDir, concurrency) => {
  return new Promise((resolve, reject) => {
    const sourcePath = self.source.dir;
    const destinationPath = self.destination.dir;

    console.log('begin to sync files, concurrency:' + concurrency);
    const syncResult = [];
    const cpFileTasker = async (fileIdx) => {
      const file = syncList[fileIdx];
      const syncInfo = `${self.source.module}:/${file.uri} ==> ${self.destination.module}:/${destinationDir}${file.name}`;
      console.log(`sync #${fileIdx + 1}/${syncList.length} file... `, syncInfo);

      try {
        await self.cp(file.uri, destinationDir + file.name);
        console.log(`sync #${fileIdx + 1}/${syncList.length} file finished`);
        syncResult.push(syncInfo);
      } catch (err) {
        console.log(`sync #${fileIdx + 1}/${syncList.length} file error `, err);
        throw err;
      }
    };

    const q = async.queue(cpFileTasker, concurrency);

    q.drain(() => {
      console.log(`sync finished, sync ${syncList.length} file(s) in total`);
      resolve(syncResult);
    });

    const cpErrorHandler = (err) => {
      if (err) {
        console.log('sync file error, ', err);
        q.kill();
        reject(err);
      }
    };

    for (let i = 0; i < syncList.length; i++) {
      q.push(i, cpErrorHandler);
    }
  });
};

const match = function(fileName, pattern) {
  const patternArray = pattern.split(',');
  for (let i = 0; i < patternArray.length; i++) {
    const pat = patternArray[i];
    if (minimatch.minimatch(fileName, pat, {
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
