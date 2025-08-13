/*
 *
 * Folders.io basic routing example.
 *
 * Uses the folders API to serve files and folders from various providers.
 * This hooks into the union.js event to serve multiple providers on a single share Id.
 * It uses the fio.streams map to track multiple share Ids.
 *
 */
 
class ProviderFriendly {
	constructor(fio, uuid){
		this.fio = fio;
		uuid = uuid || (function() {
			const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
				const r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;
				return v.toString(16);
			});
			return id;
		});
		if(typeof(uuid) == 'string') this.uuid = (function() {
			return uuid;
		});
		else this.uuid = uuid;
	}

	fioHandler(channel) {
		const fio = this.fio;
		const routeHandler = {
			getCurrentSession: function() {
				return channel.session;
			},

			send: function(data) {
				if(fio.streams && data.type == "DirectoryListRequest") {
					const shareId = data.data.shareId;
					if(shareId in fio.streams) {
						const target = fio.streams[shareId];
						for(const i in target) if(target[i].onList) {
							target[i].onList(data);
						}
						return;
					}
				}
				if(data.type == "RaftJoin") {
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
				const streamId = this.uuid();
				if(!fio.streams) fio.streams = {};
				if(!fio.streams[shareId]) fio.streams[shareId] = {};
				fio.streams[shareId][streamId] = listener;
				listener.onClose = function() {
					const obj = fio.streams[shareId];
					delete obj[streamId];
					let empty = true;
					for (const key in obj) {
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
	}
}

export default ProviderFriendly;
