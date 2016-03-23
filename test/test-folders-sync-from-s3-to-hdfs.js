// A test case show sync files from AWS folders to Hdfs folders.
// NOTES, MUST add THE 'FOLDERS-AWS' and 'FOLDERS-HDFS' dependence.
// "folders-aws": "git://github.com/foldersjs/folders-aws.git#master",
// "folders-hdfs": "git://github.com/foldersjs/folders-hdfs.git#master"

var Fio = require('../src/api');
var SyncUnion = Fio.syncUnion();

var awsConfig = {
  "accessKeyId" : "=== AWS KEY ===",
  "secretAccessKey" : "=== AWS ACCESS KEY ===",
  "service" : "S3",
  "region" : "us-east-1",
  "bucket" : "foldersio",
  "partSize" : 10485760,
  "queueSize" : 5
};

var hdfsConfig = {
  baseurl : "=== WEBHDFS URL ===",
  username : 'hdfs'
};

var mounts = {
  source : {
    module : 'aws',
    opts : awsConfig,
    dir : '/S3/us-east-1/foldersio'
  },
  destination : {
    module : 'hdfs',
    opts : hdfsConfig,
    dir : '/'
  }
};

var syncOptions = {
  // threadNum : 5,
  filter : '*.txt',
  ignoreCase : true, // ignore case when compare the file name.
  compareSize : true, // need to compare file size
  ignoreDirPath : false // need to compare the whole relative path (include dir path)
};

var syncUnion = new SyncUnion(mounts, syncOptions);

var testSync = function() {

  syncUnion.sync(function(err, result) {
    if (err) {
      return console.log('union sync error: ', err);
    }

    console.log('union sync success, ', result);
  });
};

var testLs = function() {

  syncUnion.ls(function(err, result) {
    if (err) {
      return console.log('union sync error: ', err);
    }

    console.log('union sync success, ', result);
  });
};
setTimeout(testSync, 100);
