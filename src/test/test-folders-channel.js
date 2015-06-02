/*
 *(c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 */

/*
 * Test to check if channels for receiving 
 * requests over folders.io stream has
 * been initialized or not .uses listen 
 * for this purpose
 */

var listen = require("./listen")
var assert = require("assert")

describe('test folders.io channels are succesfully created & initialized ', function() {
	this.timeout(10000)
	it('should contain the folders.io channel prefix and should not timeout (10 secs)', function(done) {
		
		 new listen(function(channel){
			console.log(channel.channel)
			assert.notEqual(-1,channel.channel.indexOf("io.folders.p2p."))
			done()
		})
		
		});
});


