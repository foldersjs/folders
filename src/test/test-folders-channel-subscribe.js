/*
 *(c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 */

/*
 * Test to check if channels for receiving 
 * requests over folders.io stream are receiving
 * data.uses listen 
 * for this purpose
 */

var listen = require("./listen")
var assert = require("assert")
var outbound = require('request')

describe('test nodejs.folders.io  channels are succesfully receiving stream data', function() {
	this.timeout(10000)
	it('should display folders.io stream data on channels and should not timeout (10 secs) ', function(done) {		
		listen(function(channel){
			console.log(channel.channel)
			var shareId = channel.session.shareId
			var uri =  'https://folders.io/dir/'+ shareId
			
			outbound({uri:uri,method:'GET',rejectUnauthorized:false},function(result){
				
				console.log("DirectoryListRequest packet available on stream " + result)
			})
			
			channel.subscribe ("DirectoryListRequest",function(data,envelop){
				console.log(data.type + ": signal available on nodejs.folders.io channels")
				assert.equal(data.type,'DirectoryListRequest')
				
				done()
				
			})
			
		})
		
		
		});
});


