import UnionFio from '../src/union.js';
import FoldersTest from './test-folders.js';
import Fio from '../src/api.js';

const fio = new Fio();

const mounts = [ {
	"stub" : fio.provider("stub")
}, {
	"local" : fio.provider("local")
}, {
	"memory" : fio.provider("memory")
}
];

const unionfs = new UnionFio(fio, mounts, {
	"view" : "list"
});

const foldersTest = new FoldersTest(unionfs);
foldersTest.test('/memory/');
