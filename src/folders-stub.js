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
var Readable = require('stream').Readable

var StubFs = function(prefix) {
	this.prefix = prefix || "/http_window.io_0:stub/";
}
	
StubFs.prototype.stubData = {
    lsMime: ["Content-Type:application/json"],
    lsData: [{"name":"stub-file.txt",
      "uri":"/stub-file.txt",
      "modificationTime":"1378590055000", //Note: this is Unix timestamp premultiplied by 1000
	  //"modificationTime": "Mon, 10 Oct 2011 23:24:11 GMT",
	  "fullPath":"/stub-file.txt",
      "size":"960","extension":"txt",
	  "type":"text/plain"}],
    asMime: [
      "X-File-Date:2013-09-07T21:40:55.000Z",
      "X-File-Name:stub-file.txt",
      "X-File-Size:960",
      "X-File-Type:text/plain"
    ],
    asData: function() {
		var s = new Readable();
		s.push((new Array(960 + 1)).join("Z"));
		s.push(null);
		return s;
	},
    writeData:[{"name":"stub-file.txt"}],
    writeMime:["Content-Type:application/json"]
};

StubFs.prototype.ls = function(path, cb) {
  var data = JSON.parse(JSON.stringify(this.stubData.lsData));
	cb(null,data);
};

StubFs.prototype.cat = function(path, cb) {
  	cb(null,{stream:this.stubData.asData(),size:960,name:'stub-file.txt',meta: { mime:"text/plain", date: (0+new Date()) }});
//  	cb({streamId: data.data.streamId, data: stubData.asData,
//		headers: stubData.asMime, shareId: data.shareId});
};
  
StubFs.prototype.write = function(uri, data, cb){
  	cb(null,'write data success');
//  	cb({streamId: data.data.streamId, data:stubData.writeData,
//  		headers:stubData.writeMime, shareId:data.shareId});
};
  
module.exports = StubFs;
