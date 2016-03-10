var UnionFio = require('../src/folders-sync-union');
var FoldersTest = require('./test-folders');
var Fio = require('../src/api');

var fio = new Fio();

var mounts = [ {
  "stub" : fio.provider("stub")
}, {
  "memory" : fio.provider("memory")
} ];

var unionfs = new UnionFio(fio, mounts);

var syncOptions = {
  // threadNum : 5,
  filter : '*.txt',
  ignoreCase : true,
  compareSize : true
};

// a test case sync the *.txt file in the root of STUB folder to root of Memory folder.
unionfs.sync('/stub/', '/memory/', syncOptions, function(err, result) {
  if (err) {
    return console.log('union sync error: ', err);
  }

  console.log('union sync success, ', result);

  unionfs.ls('/memory/', function(err, files) {
    if (err) {
      return console.log('ls memory root failed,', err);
    }

    console.log('ls memory folders after file sync, ', files);
  });
});