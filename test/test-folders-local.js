var FoldersTest = require('./test-folders');
var FoldersLocal = require('../folders-local');

var foldersTest = new FoldersTest(new FoldersLocal());
foldersTest.test('.');