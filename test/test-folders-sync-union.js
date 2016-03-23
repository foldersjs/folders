var SyncUnionFio = require('../src/folders-sync-union');
var FoldersTest = require('./test-folders');

var mounts = {
  source : {
    module : 'stub',
    // opts : null,
    dir : '/'
  },
  destination : {
    module : 'memory',
    // opts : null,
    dir : '/'
  }
/*
 * destination :{ module: 'hdfs', opts : { baseurl : "http://45.55.223.28/webhdfs/v1/data/", username : 'hdfs' } }
 */
};

var syncOptions = {
  // threadNum : 5,
  filter : '*.txt',
  ignoreCase : true,
  compareSize : true
};

var syncUnionFS = new SyncUnionFio(mounts, syncOptions);

// test compare file, with compareSize, ignoreCase, ignoreDirPath options.
var testSyncCompareFile = function() {
  var testCompareFile = function(sourcePath, folder1, destinationPath, folder2, option) {
    console.log(folder1);
    console.log(folder2);
    console.log(option);
    console.log(syncUnionFS.compareFile(sourcePath, folder1, destinationPath, folder2, option));
    console.log();
  }

  // test compareSize
  var folder1 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 436
  };
  var folder2 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 437
  };
  var option = {
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

  // test ignoreCase
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

  // Test files in sub-folder, ignoreDirPath=false
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
  // Expected false, because they are in different relative path.
  testCompareFile('source/folder1', folder1, '/destination/folder2/', folder2, option);

  // Test files in sub-folder, ignoreDirPath=true
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
  // Expected true, because they are in different relative path, but ignoreDirPath=true
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
  // Expected true,
  testCompareFile('/source/folder1/', folder1, '/destination/folder2/', folder2, option);
}

// a test case sync the *.txt file in the root of STUB folder to root of Memory folder.
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

    // temp hack to verify the final files in momory
    var today = new Date().toISOString().slice(0, 10);
    syncUnionFS.destination.provider.ls('/' + today, function(err, files) {
      if (err) {
        return console.log('ls memory root failed,', err);
      }

      console.log('ls memory folders after file sync, ', files);
    });

  });
});