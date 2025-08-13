/*
 * Folders API entry point.
 *
 * Dual-licensed by folders.io:
 * http://opensource.org/licenses/MIT
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 */

// todo: close down routes for garbage collection

import BufferStream from './stream-buffer.js';
import * as Handshake from './handshake.js';
export { Handshake };
import fs from './fs.js';
import provider from './provider.js';
import union from './union.js';
import syncUnion from './folders-sync-union.js';
import stub from './folders-stub.js';
import local from './folders-local.js';

let route = {};
const registry = {};

class Fio {
	constructor(baseUri, asDebug, routeImpl) {
		// FIXME: The default implementation could use the memory based backend.
		routeImpl = routeImpl || route;
		if(route !== routeImpl) route = routeImpl;
		this.baseUri = baseUri || "";
		asDebug = asDebug || false;

		// FIXME: Define debugging. In this case, we just pull it from our instantiation arg.
		this.DEBUG = true;

		if(asDebug === true) {
			// domain was used in debug mode to catch errors instead of exiting, but it is deprecated.
		}
	}

	static providers = {};

	static fs() {
		return fs;
	}

	fs() {
		return fs;
	}

	static router() {
		return provider;
	}

	router() {
		return provider;
	}

	static provider(module, opts) {
		const create = async (prefix) => {
			if(!(module in Fio.providers)) {
				try {
					if (['stub','local','memory'].indexOf(module) > -1){
						Fio.providers[module] = (await import(`./folders-${module}.js`)).default;
					} else { //external import, make sure add dependence, npm install folders-module
						Fio.providers[module] = (await import(`folders-${module}`)).default;
					}
				} catch(e) {
					//if exception, we will try import using the module name directly
					console.error(e);
					Fio.providers[module] = (await import(module)).default;
				}
			}
			const Provider = Fio.providers[module];
			return new Provider(prefix, opts);
		};
		const fn = {create: create};
		return fn;
	}

	provider(module, opts) {
		return Fio.provider(module, opts);
	}

	static union() {
		return union;
	}

	union() {
		return union;
	}

	static syncUnion(){
	  return syncUnion;
	}

	syncUnion(){
	  return syncUnion;
	}

	static stub() {
		return stub;
	}

	stub() {
		return stub;
	}

	static local() {
		return local;
	}

	local() {
		return local;
	}

	watch(session, namespacePrefix) {
		const baseUri = this.baseUri;
		namespacePrefix = namespacePrefix || "io.folders.p2p.";

		const watch = (session) => {
			const namespace = namespacePrefix + session.shareId;
			registry[session.shareId] = session;

			return new route.Promise(function(ready, error) {
				const channel = route.channel(namespace);
				let hasReady = false;
				const onMessage = function(data) {
					// Ignore multiplexing.
					data.shareId = session.shareId;
					session.lastMessage = +new Date();
					if(!hasReady) {
						// process.nextTick
						setTimeout(function() {
							channel.publish(data.type, data);
						}, 0);
					}
					else {
						channel.publish(data.type, data);
					}
				};
				const onClose = function() {
					channel.publish("SocketClosed", session);
					session.lastClosed = +new Date();
					session.hasOpen = false;
				}
				const onReady = function(result) {
					console.log("Route opened", baseUri, session, result.headers);
					session.lastOpened = +new Date();
					session.hasOpen = true;
					channel.session = session;
					channel.send = onMessage;
					ready(channel);
					setTimeout(function() { hasReady = true; }, 0);
				};
				const stream = route.watch(baseUri, session, onReady, onMessage, onClose);
			});
		};

		if(session) {
			if(this.DEBUG) {
				console.info("Ready to resume session: ", session);
			}
			return watch(session);
		}

		const open = new route.Promise((ready, error) => {
			if(this.DEBUG) {
				console.info("Ready to open folders.io host: ", this.baseUri);
			}
			route.open(baseUri, (session, error) => {
				if(error) error(err);
				else {
					if(this.DEBUG) {
						console.info("Folders.io session created: ", session);
					}
					ready(watch(session));
				}
			});
		});
		return open;
	}

	stream(id, stream, headers) {
		if(!this.threads) this.threads = {};
		if(id in this.threads) {
			const response = this.threads[id];
			delete this.threads[id];
			return response(stream, headers);
		}
		else {
			console.log("stream not found for id", id);
			return false;
		}
	}

	lookup(cb) {
		return route.resolve(shareName);
	}

	asPostUri(streamId) {
		const uri = this.baseUri + "/upload_file?streamId=" + streamId;
		return uri;
	}

	post(streamId, data, headerMap, tokenId) {
		const uri = this.asPostUri(streamId);

		const headers = {};
		if(headerMap) for(let i = 0; i < headerMap.length; i++) {
			const x = headerMap[i].split(':',2);
			headers[x[0]] = x[1];
		}
		headers.Cookie = registry[tokenId].token;

		let contentLength = headers['content-length'];

		const transform = false; // new Nacl(null, contentLength);

		// JSON, response to /dir/, UTF-8.
		if(typeof(data) == 'string') {
			contentLength = data.length;
			headers['content-length'] = contentLength;
			data = new BufferStream(null, data);

			if(false && transform) {
				const handshakePub = null;
				return data.pipe(transform).pipe(BufferStream.readSync(function(buffer) {
					let data = [];
					const output = buffer.toString('base64');
					data.push({ name: ".", uri: "#/.", extension: "", "type":"+folder", "data": output, size: buffer.length });
					data.push({ name: "README.md", uri: "#/README.md", extension: "txt", size: contentLength, type: "text/plain", publicKey: handshakePub });
					data = JSON.stringify(data);
					contentLength = data.length;
					headers['content-length'] = contentLength; // + transform.overheadLength;
					return new BufferStream(null, data).pipe(route.post(uri, { headers: headers }));
				}));
			}
		}

		if(typeof(data) == 'object' && typeof(data.pipe) == 'function') {
			if(transform) {
				// FIXME: Get accurate content length.
				headers['content-length'] = contentLength + transform.overheadLength;
				data = data.pipe(transform);
			}

			const internalStream = this.stream(streamId, data, headers);
			if(internalStream) {
				console.log("post to stream ID", streamId);
				return internalStream;
			}

			headers['origin'] = this.baseUri;
			// FIXME: stdout is used for debugging.
			return data.pipe(route.post(uri, { headers: headers })).pipe(process.stdout);
		}
	}

	simple(cb, baseUri) {
		baseUri = baseUri || this.baseUri;
		return simple(baseUri, /*onReady*/ cb, /*onError*/ cb);
	}

	static simple(cb, baseUri) {
		return simple(baseUri, cb, cb);
	}

	createNode(key) {
		const endpoint = Handshake.endpoint(key);
		const publicKey = Handshake.stringify(key.publicKey);

		console.log(">> Server --MY-- Public key :")
		console.log(publicKey);

		const options = {
			uri: this.baseUri + '/' + endpoint,
			port: 8090,
			method: 'PUT',
			body:publicKey
		};

		return options;
	}

	async handshake(serviceKey) {
		const alice = Handshake.createKeypair(); //keypair of client
		this.alice = alice; //generete session

		const bob = {publicKey: serviceKey};
		this.bob = bob;

		const res = Handshake.createHandshake(alice, bob);
		this.session = res.session;
		this.handshake = res.handshake;

		console.log("Client contains --MY-- public key ");
		console.log(this.handshake);

		const endpoint = Handshake.endpoint(alice);
		this.endpoint = endpoint;

		const options = {
			uri: this.baseUri + '/' + this.endpoint,
			port: 8090,
			method: 'PUT',
			body: this.handshake
		};

		return new Promise((resolve, reject) => {
			route.request(options)
				.on('response', (response) => {
					console.log('handshake OK');
					resolve();
				})
				.on('error', (err) => {
					console.log('handshake Error!');
					reject(err);
				})
				.pipe(process.stdout);
		});
	}

	postSigned(path, data) {
	   let uri = this.baseUri + '/' + this.endpoint + '/' + path;
	   if (typeof(data) == 'undefined') data = {};
	   data['sign'] = Handshake.signRequest(path, this.session);

	   request({
			uri: uri,
			port: 8090,
			method: 'POST',
			body: JSON.stringify(data)
	   })
	   .pipe(process.stdout);
	}
}

const simple = function(baseUri, onReady, onError, onListRequest, onBlobRequest) {
	const fio = new Fio(baseUri);
	let baseChannel = null;
	fio.watch().then(function(channel) {
		baseChannel = channel;
		channel.subscribe("SocketClosed", function() {
			// channel.unsubscribe("*");
		});
		channel.subscribe("DirectoryListRequest", function(data, envelope) {
			if(onListRequest) onListRequest(data);
		});
		channel.subscribe("FileRequest", function(data, envelope) {
			if(onBlobRequest) onBlobRequest(data);
		});
		if(onReady) onReady(fio);
	}, function(err) {
		if(onError) { onError(err); return; }
		console.error("Failed to create a Folders.io socket: " + err.message);
		console.error("trace:", err.stack);
	});

	const exports = {
		onError: function(handler) { onError = handler; return this; },
		onList: function(list) { onListRequest = list; return this; },
		onBlob: function(blob) { onBlobRequest = blob; return this; },
		asChannel: function() { return baseChannel; },
		fio: fio
	};
	return exports;
};

export default Fio;
