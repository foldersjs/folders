/*
 *
 * Folders.io basic routing example.
 *
 * Uses the folders API to serve files and folders from various providers.
 *
 */
 
 
var ProviderFriendly = function(){
		uuid = uuid || (function() {
			var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
				var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;
				return v.toString(16);
			});
			return id;
                });
		if(typeof(uuid) == 'string') this.uuid = (function() {
			return uuid;
		});
		else this.uuid = uuid;
}


ProviderFriendly.prototype.fioHandler = function(channel) {

	var routeHandler = { 
				
		getCurrentSession: function() {
			return channel.session;
		},
		
		send: function(data) {
		// Could also check channel id vs target shareId.
		
			if(fio.streams && data.type == "DirectoryListRequest") {
				var shareId = data.data.shareId;
				if(shareId in fio.streams) {
					var target = fio.streams[shareId];
					for(var i in target) if(target[i].onList) {
						target[i].onList(data);
					}
					return;
				}
			}
			if(data.type == "RaftJoin") {
			// for(i in fio.streams) if(fio.streams[i][..].onJoin(...));
				return;
			}
			if(data.type == "SetFilesRequest") {
				
				
			}
			if(data.type == "FileRequest") {
				
				
			}

			channel.send(data);
		},
		once: function(streamId, cb) {
			if(!fio.threads) fio.threads = {};
				fio.threads[streamId] = cb;
		},
		until: function(shareId, listener) {
			var streamId = this.uuid();
			if(!fio.streams) fio.streams = {};
			if(!fio.streams[shareId]) fio.streams[shareId] = {};
			fio.streams[shareId][streamId] = listener;
			listener.onClose = function() {
				var obj = fio.streams[shareId];
				delete obj[streamId];
		        var empty = true; for (key in obj) {
					if (obj.hasOwnProperty(key)) {
						empty = false;
						break;
					}
				};
			if(empty) delete fio.streams[shareId];
			};
			console.log("cool", channel, shareId, streamId);
		}
	}
	
	
	
	console.log("Folders.io channel is active:", channel.channel);

	// exports
	// channel, routeHandler
}



module.exports = ProviderFriendly;
