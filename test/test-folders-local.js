import FoldersTest from './test-folders.js';
import FoldersLocal from '../src/folders-local.js';

const foldersTest = new FoldersTest(new FoldersLocal());
foldersTest.test('.');