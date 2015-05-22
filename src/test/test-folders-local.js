var FoldersLocal = new require('../folders-local');
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs');

var local = new FoldersLocal();

describe('test command ls for folders local', function() {
	it('should ls the file data in current dir', function(done) {
		local.ls('.', function cb(files,err) {
			if (err){
				console.log(err);
				done();
				return;
			}
			
			console.log("\nls results:");
			console.log(files);

			local.meta('.', files, function cb(results) {
				console.log("\nmeta results:");
				console.log(results);
				done();
			});
		});
	});
});

describe('test command cat for folders local', function() {
	it('should cat the file data in current dir', function(done) {
		local.cat({
			shareId : "test-share-Id",
			data : {
				fileId : "./gulpfile.js"
			}
		}, function cb(results,err) {
			if (err){
				console.log(err);
				done();
				return;
			}
			console.log("\ncat result:");
			console.log(results);
			console.log("\nfile data");
			var stream = results.data;
			stream.on('readable', function() {
				var chunk;
				var decoder = new StringDecoder('utf8');
				while (null !== (chunk = stream.read())) {
					console.log('\ngot %d bytes of data', chunk.length);
					//var strdata = decoder.write(chunk);
					//console.log('data:\n+' + strdata);
				}
				done();
			});
		});
	});
});

describe('test command put for folders local', function() {
	it('should put the data to dest file in current dir', function(done) {
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
		}, function(result,err) {
			if (err){
				console.log(err);
				done();
				return;
			}
			console.log(result);

			fs.exists(fileNameToWrite, function(exists) {
				if (exists) {

					console.log("local file write success, file:" + fileNameToWrite);
					local.ls(".", function cb(files) {
						console.log("\nls the tmp test.data we upload:");
						console.log(files);

						console.log("delete the tmp file we write");
						fs.unlinkSync(fileNameToWrite);
						done();
					});

				} else {
					console.log("local file write failed, file:" + fileNameToWrite);
					done();
				}
			});

		});
	});
});
