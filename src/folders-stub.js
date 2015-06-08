/*
 * This file, stub.js, is CC0 Licensed/Public domain, MIT and/or Apache 2.0.
 * It is intented to illustrate basic usage of the folders.io node.js library.
 *
 * Send responses to list and file requests for testing purposes.
 *
 * Stub data layout:
 *  Share a single text file named "stub-file.txt".
 *  The text file has 960 bytes of the letter "Z".
 *
 */

var StubFs = function(prefix) {
	this.prefix = prefix || "/http_window.io_0:stub/";
}
	
StubFs.prototype.stubData = {
    lsMime: ["Content-Type:application/json"],
    lsData: [{"name":"stub-file.txt",
      "uri":"#/67ee0a44-5eee-40a6-a50a-96d4665e554e/stub-file.txt",
      //"modificationTime":"1378590055000",
	  "modificationTime": "Mon, 10 Oct 2011 23:24:11 GMT",
	  "fullPath":"/stub-file.txt",
      "size":"960","extension":"txt",
	  "type":"text/plain"}],
    asMime: [
      "X-File-Date:2013-09-07T21:40:55.000Z",
      "X-File-Name:stub-file.txt",
      "X-File-Size:960",
      "X-File-Type:text/plain"
    ],
    asData: (new Array(960 + 1)).join("Z"),
    writeData:[{"name":"stub-file.txt"}],
    writeMime:["Content-Type:application/json"]
};

StubFs.prototype.ls = function(path, cb) {
	cb(this.stubData.lsData);
};

StubFs.prototype.cat = function(path, cb) {
  	cb({stream:this.stubData.asData,size:960,name:'stub-file.txt',meta: { mime:"text/plain", date: (0+new Date()) }});
//  	cb({streamId: data.data.streamId, data: stubData.asData,
//		headers: stubData.asMime, shareId: data.shareId});
};
  
StubFs.prototype.write = function(uri, data, cb){
  	cb('write data success');
//  	cb({streamId: data.data.streamId, data:stubData.writeData,
//  		headers:stubData.writeMime, shareId:data.shareId});
};
  
module.exports = StubFs;
