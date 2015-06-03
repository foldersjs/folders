var UnionFio = require('../union');
var FoldersTest = require('./test-folders');
var Fio = require('../api');

var fio = new Fio();

var mounts = [ {
	"stub" : fio.provider("stub")
}, {
	"local" : fio.provider("local")
}, {
	"memory" : fio.provider("memory")
}
/*
 // here we have to install specified extenal module.
 , {
	"ftp" : fio.provider("ftp", {
		connectionString : "ftp://test:123456@localhost:3333",
		enableEmbeddedServer : true
	})
}, {
	"ssh" : fio.provider("ssh", {
		connectionString : "ssh://test:123456@localhost:3334",
		enableEmbeddedServer : true
	})
}, {
	"hdfs" : fio.provider("hdfs", {
		baseurl : "http://45.55.223.28/webhdfs/v1/data/",
		username : 'hdfs'
	})
} */
];

var unionfs = new UnionFio(fio, mounts, {
	"view" : "list"
});

var FoldersLocal = require('../folders-local');
var foldersTest = new FoldersTest(unionfs);
foldersTest.test('.');