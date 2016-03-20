var FoldersTest = require('./test-folders');
var FoldersLocal = require('../src/folders-local');

var foldersTest = new FoldersTest(new FoldersLocal());
foldersTest.test('.');