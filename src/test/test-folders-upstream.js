/*
 *(c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 */

/*
 * Test to check if fio is able to send response data  
 * upstream  back to bob on receiving DirectoryListRequest signal. 
 * on channels .Uses listen and folders-stub to 
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


