var FoldersLocal = new require('../folders-local');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');

var local = new FoldersLocal();

local.ls('.', function cb(files) {
	console.log("\nls results:");
	console.log(files);

	local.meta('.', files, function cb(results) {
		console.log("\nmeta results:");
		console.log(results);
	});

});

local.cat({
	shareId : "test-share-Id",
	data : {
		fileId : "test-folders-local.js"
	}
}, function cb(results) {
	console.log("\ncat result:");
	console.log(results);
	console.log("\nfile data");
	var stream = results.data;
	stream.on('readable', function() {
		var chunk;
		var decoder = new StringDecoder('utf8');
		while (null !== (chunk = stream.read())) {
			console.log('\ngot %d bytes of data', chunk.length);
			var strdata = decoder.write(chunk);
			console.log('data:\n+' + strdata);
		}
	});
});

var fileNameToWrite = "./test.dat";
local.write({
	uri : fileNameToWrite,
	streamId : "streamId",
	data : (new Array(960 + 1)).join("Z"),
	headers : {
		"X-File-Date" : "2013-09-07T21:40:55.000Z",
		"X-File-Name" : "stub-file.txt",
		"X-File-Size" : "960",
		"X-File-Type" : "text/plain"
	},
	shareId : "test-share-Id"
}, function(result) {
	console.log(result);

	fs.exists(fileNameToWrite, function(exists) {
		if (exists) {

			console.log("local file write success, file:" + fileNameToWrite);
			local.ls(".", function cb(files) {
				console.log("\nls the tmp test.data we upload:");
				console.log(files);

				console.log("delete the tmp file we write");
				fs.unlinkSync(fileNameToWrite);
			});

		} else {
			console.log("local file write failed, file:" + fileNameToWrite);
		}
	});

});
