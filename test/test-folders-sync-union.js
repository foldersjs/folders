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