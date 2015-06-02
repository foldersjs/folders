/*
 *
 * Folders.io basic routing example.
 *
 * Uses the folders API to serve files and folders from various providers.
 * This hooks into the union.js event to serve multiple providers on a single share Id.
 * It uses the fio.streams map to track multiple share Ids.
 *
 */
 
 
var Fio = require('./api');
var helpers = require('./util/helpers')
var route = require('./route')
var fio = new Fio(null,null,route)
var subscriberApp = require('./app/subscriberApp')

var ProviderFriendly = function(argv,obj){
	
		argv = argv == undefined ? {}:argv;	
		
		this.uuid = argv['shareId'] ||  helpers.uuid();
		
		var  provider = argv['provider'] || 'stub';
		
		switch (provider){
			
			case 'stub':
				provider = Fio.stub()
				break;
			case 'local':
				provider = Fio.local()
				break;
				
		}
		this.provider = new provider(fio);

		this.o = obj;
}


ProviderFriendly.prototype.fioHandler = function(channel) {
	var self = this 
    fio.watch().then(function(channel){

	var routeHandler = { 
				
		getCurrentSession: function() {
			return channel.session;
		},
		
		send: function(data) {

			// FIXME: Handle SocketClose events gracefully.

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
				var empty = true;
				for (key in obj) {
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
	self.o.startProxy(routeHandler)

	console.log("Folders.io channel is active:", channel.channel);
	subscriberApp(self,channel);
	
	})

	// exports
	// channel, routeHandler
}



module.exports = ProviderFriendly;
