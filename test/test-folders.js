/*
 * A General Test case for folders.io provider. A public test() method which
 * will call ls/write/cat for testing. The test case first ls the root of dir,
 * then write a test file to data/test_dest.dat and at last cat the file upload.
 */

var fs = require('fs');

var FoldersTest = function(folder) {
	this.folder = folder;
}

module.exports = FoldersTest;

/**
 * a basic test for folders provider step 1: ls dir step 2: write a file
 * 'test.txt' to dir step 3: cat the file 'test.txt' from dir
 * 
 * @param the
 *          dir where to execute the test
 */
FoldersTest.prototype.test = function(dir) {
	var folder = this.folder;
	console.log("[Test-folders] start test for folders,", folder);

	if (dir.length && dir.substr(-1) != "/")
		dir = dir + "/";

	// step 1: ls command
	console.log("[Test-folders] ls dir/files in dir,", dir);
	folder.ls(dir, function(err, data) {
		if (err) {
			console.error(err);
			// TODO assert false
			return;
		}
		console.log('[Test-folders] ls result:', data);

		// step 2: write command, put data(Buffer or Stream) to folder provider
		// var buf = new Buffer((new Array(960 + 1)).join("Z"));
		// NOTES, here we get a simple readable stream by reading a test file local
		var testDataFile = dir + "data/test_dest.dat";
		console.log("[Test-folders] testDataFile,", testDataFile);
		var stream = fs.createReadStream('./data/test.txt');
		folder.write(testDataFile, stream, function(err, data) {
			if (err) {
				console.error(err);
				// TODO assert false
				return;
			}
			console.log('[Test-folders] write result,',testDataFile);

			// step 3: cat the file uploaded
			folder.cat(testDataFile, function(err, data) {
				if (err) {
					console.error(err);
					// TODO assert false
					return;
				}

				console.log('[Test-folders] cat file ',testDataFile,' success, stream.size:', data.size);
			});

		});

	});
};
