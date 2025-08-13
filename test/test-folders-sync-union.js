import SyncUnionFio from '../src/folders-sync-union.js';
import FoldersTest from './test-folders.js';

const mounts = {
  source : {
    module : 'stub',
    dir : '/'
  },
  destination : {
    module : 'memory',
    dir : '/'
  }
};

const syncOptions = {
  filter : '*.txt',
  ignoreCase : true,
  compareSize : true
};

const syncUnionFS = new SyncUnionFio(mounts, syncOptions);

const testSyncCompareFile = function() {
  const testCompareFile = function(sourcePath, folder1, destinationPath, folder2, option) {
    console.log(folder1);
    console.log(folder2);
    console.log(option);
    console.log(syncUnionFS.compareFile(sourcePath, folder1, destinationPath, folder2, option));
    console.log();
  }

  let folder1 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 436
  };
  let folder2 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 437
  };
  let option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : true
  };
  testCompareFile('/', folder1, '/', folder2, option);

  folder1 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 436
  };
  folder2 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 437
  };
  option = {
    ignoreCase : true,
    compareSize : false,
    ignoreDirPath : true
  };
  testCompareFile('/', folder1, '/', folder2, option);

  folder1 = {
    name : 'copy.txt',
    fullPath : '/copy.txt',
    size : 436
  };
  folder2 = {
    name : 'COPY.txt',
    fullPath : '/COPY.txt',
    size : 436
  };
  option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : true
  };
  testCompareFile('/', folder1, '/', folder2, option);

  folder1 = {
    name : 'copy.txt',
    fullPath : '/copy.txt',
    size : 436
  };
  folder2 = {
    name : 'COPY.txt',
    fullPath : '/COPY.txt',
    size : 436
  };
  option = {
    ignoreCase : false,
    compareSize : true,
    ignoreDirPath : true
  };
  testCompareFile('/', folder1, '/', folder2, option);

  folder1 = {
    name : 'copy.txt',
    fullPath : '/source/folder1/copy.txt',
    size : 436
  };
  folder2 = {
    name : 'copy.txt',
    fullPath : '/destination/folder2/subfolder/copy.txt',
    size : 436
  };
  option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : false
  };
  testCompareFile('source/folder1', folder1, '/destination/folder2/', folder2, option);

  folder1 = {
    name : 'copy.txt',
    fullPath : '/source/folder1/copy.txt',
    size : 436
  };
  folder2 = {
    name : 'copy.txt',
    fullPath : '/destination/folder2/subfolder/copy.txt',
    size : 436
  };
  option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : true
  };
  testCompareFile('source/folder1', folder1, '/destination/folder2/', folder2, option);

  folder1 = {
    name : 'copy.txt',
    fullPath : '/source/folder1/subfolder/copy.txt',
    size : 436
  };
  folder2 = {
    name : 'copy.txt',
    fullPath : '/destination/folder2/subfolder/copy.txt',
    size : 436
  };
  option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : false
  };
  testCompareFile('/source/folder1/', folder1, '/destination/folder2/', folder2, option);
}

syncUnionFS.ls(function(err, result) {
  if (err) {
    return console.log('ls error: ', err);
  }

  console.log('ls sync union before sync, ', result);

  syncUnionFS.sync(function(err, result) {
    if (err) {
      return console.log('union sync error: ', err);
    }

    console.log('union sync success, ', result);

    const today = new Date().toISOString().slice(0, 10);
    syncUnionFS.destination.provider.ls('/' + today, function(err, files) {
      if (err) {
        return console.log('ls memory root failed,', err);
      }

      console.log('ls memory folders after file sync, ', files);
    });

  });
});