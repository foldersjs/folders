/*
 *(c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 */

/*
 * Test functionality of nodejs.folders.io core .
 * open route to folders.io
 * watch pipe for events 
 * create and initialize channels
 * generate a user DirectoryListRequest on folders.io server
 * uses folders-stub provider to send response back to server
 * Uses listen and folders-stub to 
 * generate test data for this purpose
 */

var listen = require("./listen")
var assert = require("assert")
var outbound = require('request')
var Fio =  require('../api')
describe('test whether fio is able to stream response data back to bob ', function() {
	this.timeout(10000)
	it('should  post data successfully upstream and should not timeout (10 secs) ', function(done) {		
		listen(function(channel,fio){
			console.log(channel.channel)
			var shareId = channel.session.shareId
			var uri =  'https://folders.io/dir/'+ shareId
			
			outbound({uri:uri,method:'GET',rejectUnauthorized:false},function(result){
				
				console.log("DirectoryListRequest packet available on stream " + result)
			})
			
			channel.subscribe ("DirectoryListRequest",function(data,envelop){
				console.log(data.type + ": signal available on nodejs.folders.io channels")
				var StubFs = Fio.stub()
				var stubFs = new StubFs(fio)
				stubFs.ls(data,function(result){
					fio.post(result.streamId, JSON.stringify(result.data),result.headers, result.shareId)
				})
				done()
				
			})
			
		})
		
		
		});
});


