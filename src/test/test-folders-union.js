var UnionFio = require('../union');
var Fio = require('../api');

var fio = new Fio();

var mounts = [ {
	"stub" : fio.provider("stub")
}, {
	"local" : fio.provider("local")
}, {
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
} ];

var unionfs = new UnionFio(fio, mounts, {
	"view" : "list"
});

unionfs.ls('/', {
	shareId : "test-share-id",
	data : {
		path : "/",
		streamId : "test-stream-id"
	}
}, function(files, err) {
	if (err) {
		console.error(err);
		return;
	}
	console.log(files);
});

// onList = function(data) {
// unionfs.onList(data);
// };
// onBlob = function(data) {
// unionfs.onBlob(data);
// };

