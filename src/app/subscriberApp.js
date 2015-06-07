/*
 *
 *
 * Event API to serve files and folders from various providers.
 *
 */
 
var onList = function(o,data){
	o.provider.ls(data,cb)
} 

var onBlob = function(o,data){
	o.provider.cat(data,cb)
	
}

/*
 * callback to be passed with current
 * implementation of folders-stub
 */
 
var cb = function(result,fio){
	console.log(result)
	fio.post(result.streamId, JSON.stringify(result.data),
      result.headers, result.shareId);
} 

 
module.exports = function(o ,channel){
	var self = o;
	channel.subscribe("DirectoryListRequest", function(data, envelope) {
		console.log("ready to list it", data);
		onList(self,data);
	});
	
	channel.subscribe("FileRequest", function(data, envelope) {
		console.log("ready to blob it", data);
		onBlob(self,data);
	});
	
	channel.subscribe("SetFilesRequest", function(data, envelope) {
		
		var shareName = Math.random().toString(36).substring(7);
		var shareId = uuid();
		var streamId = data.streamId;
		var SetFilesResponse = {
			shareId: shareId,
			shareName: shareName
		};
		fio.post(streamId, JSON.stringify(SetFilesResponse), {}, channel.session.shareId);

	
    });
	
	
	return;
}


