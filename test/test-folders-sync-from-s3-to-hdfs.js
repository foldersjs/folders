// A test case show sync files from AWS folders to Hdfs folders.
// NOTES, MUST add THE 'FOLDERS-AWS' and 'FOLDERS-HDFS' dependence.
// "folders-aws": "git://github.com/foldersjs/folders-aws.git#master",
// "folders-hdfs": "git://github.com/foldersjs/folders-hdfs.git#master"

import Fio from '../src/api.js';

const SyncUnion = Fio.syncUnion();

const awsConfig = {
  "accessKeyId" : "=== AWS KEY ===",
  "secretAccessKey" : "=== AWS ACCESS KEY ===",
  "service" : "S3",
  "region" : "us-east-1",
  "bucket" : "foldersio",
  "partSize" : 10485760,
  "queueSize" : 5
};

const hdfsConfig = {
  baseurl : "=== WEBHDFS URL ===",
  username : 'hdfs'
};

const mounts = {
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

const syncOptions = {
  concurrency : 2,
  filter : '*.txt',
  ignoreCase : true, // ignore case when compare the file name.
  compareSize : true, // need to compare file size
  // need to compare the whole relative path (include dir path)
  ignoreDirPath : false

};

const syncUnion = new SyncUnion(mounts, syncOptions);

const testLs = function() {
  syncUnion.ls(function(err, result) {
    if (err) {
      return console.log('union sync error: ', err);
    }

    console.log('union ls success, ', result);
  });
};

const testSync = function() {
  syncUnion.sync(function(err, result) {
    if (err) {
      return console.log('union sync error: ', err);
    }

    console.log('union sync success, ', result);
  });
}

const testScheduleSync = function() {
  syncUnion.scheduleSync("*/1 * * * *");
}

// testLs();
testSync();
// testScheduleSync();
