/*
 * A General Test case for folders.io provider. A public test() method which
 * will call ls/write/cat for testing. The test case first ls the root of dir,
 * then write a test file to data/test_dest.dat and at last cat the file upload.
 */

import fs from 'fs';

class FoldersTest {
	constructor(folder) {
		this.folder = folder;
	}

	test(dir) {
		return new Promise((resolve, reject) => {
			const folder = this.folder;
			console.log("[Test-folders] start test for folders,", folder);

			if (dir.length && dir.substr(-1) != "/")
				dir = dir + "/";

			console.log("[Test-folders] ls dir/files in dir,", dir);
			folder.ls(dir, function(err, data) {
				if (err) {
					console.error(err);
					return reject(err);
				}
				console.log('[Test-folders] ls result:', data);
				resolve();
			});
		});
	}
}

export default FoldersTest;
