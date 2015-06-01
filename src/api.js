/*
 * Folders.io connectors and examples
 *
 * Dual-licensed by folders.io:
 * http://opensource.org/licenses/MIT
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 */

// todo: close down routes for garbage collection

var BufferStream = require('./buffer-stream');
var route = {};
var registry = {};
var providers = {};

// FIXME: Route seems to be the remaining optional argument is likely the only argument needed.
var Fio = function(baseUri, asDebug, routeImpl) {
		// FIXME: The default implementation could use the memory based backend.
		routeImpl = routeImpl || route;
		if(route !== routeImpl) route = routeImpl;
		baseUri = baseUri || "http://window.io";
		asDebug = asDebug || false;
		this.baseUri = baseUri;

		// FIXME: Define debugging. In this case, we just pull it from our instantiation arg.
		this.DEBUG = true;
		return;
		if(asDebug === true) {
			// domain is used in debug mode to catch errors instead of exiting.
			var domain = require('domain');
			var d = domain.create();
			d.on('error', function(er) {
				console.error('uncaughtException: ' + er.message);
				console.error('error', er.stack);
			});
		}
};


/*
 *
 * Providers receive messages from watch channels and reply by post.
 *
 */

// FIXME: This seems broken.
// FIXME: Handle this in a flexible manner.
Fio.prototype.provider =
Fio.provider = function(module, opts) {
	var create = function(prefix) {
		if(!(module in providers)) {
			try {
				if (  ['stub','local','memory'].indexOf(module) > -1){
					providers[module] = require("./folders-" + module);
				}else	{ //external import, make sure add dependence in package.json 
					providers[module] = require("folders-" + module);
				}
			} catch(e) { 
				//if exception, we will try import using the module name directly
				console.error(e);
				providers[module] = require(module);
			}
		}
		var Provider = providers[module];
		return new Provider(prefix, opts);
	};
	var fn = {create: create};
	return fn;
};

// NOTES: Union seems to be a good sub to pass any provider through.
Fio.prototype.union = 
Fio.union = function() {
	return require('./union');
}

// FIXME: Quick hacks as union can't currently mount a single provider as a root.
Fio.prototype.stub = 
Fio.stub = function() {
	return require('./folders-stub');
}

Fio.prototype.local = 
Fio.local = function() {
	return require('./folders-local');
}

/*
 *
 * postaljs is an excellent channel provider:
 * https://github.com/postaljs/postal.js/blob/master/lib/postal.lodash.js
 *
 */


Fio.prototype.watch = function(session, namespacePrefix) {
	var baseUri = this.baseUri;
	namespacePrefix = namespacePrefix || "io.folders.p2p.";

	var watch = function(session) {
		var namespace = namespacePrefix + session.shareId;
		registry[session.shareId] = session;

		return new route.Promise(function(ready, error) {
			var channel = route.channel(namespace);
			var hasReady = false;
			var onMessage = function(data) {
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
			var onClose = function() {
				channel.publish("SocketClosed", session);
				session.lastClosed = +new Date();
				session.hasOpen = false;
			}
			var onReady = function(result) {
				console.log("Route opened", baseUri, session, result.headers);
				session.lastOpened = +new Date();
				session.hasOpen = true;
				channel.session = session;
				channel.send = onMessage;
				ready(channel);
				setTimeout(function() { hasReady = true; }, 0);
			};
			var stream = route.watch(baseUri, session, onReady, onMessage, onClose);
		});
	};

	if(session) {
		if(this.DEBUG) {
			console.info("Ready to resume session: ", session);
		}
		return watch(session);
	}

	var open = new route.Promise(function(ready, error) {
		if(this.DEBUG) {
			console.info("Ready to open folders.io host: ", this.baseUri);
		}
		route.open(baseUri, function(session, error) {
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
};



/*
 *
 * Responses are either UTF-8 or buffered streams with a known content length.
 * UTF-8 is used for directory listing responses.
 *
 * This is a basic protocol sending data over http.
 *
 */


// FIXME: These may belong in route.js, post entry is here as a shortcut for consuming providers.
Fio.prototype.stream = function(id, stream, headers) {
	if(!this.threads) this.threads = {};
	if(id in this.threads) {
		var response = this.threads[id];
		delete this.threads[id];
		return response(stream, headers);
	}
	else {
		console.log("stream not found for id", id);
		return false;
	}
}


Fio.prototype.lookup = function(cb) {
	return route.resolve(shareName);
};

Fio.prototype.asPostUri = function(streamId) {
	var uri = this.baseUri + "/upload_file?streamId=" + streamId;
	return uri;
};

Fio.prototype.post = function(streamId, data, headerMap, tokenId) {
	var uri = this.asPostUri(streamId);

	var headers = {};
	if(headerMap) for(var i = 0; i < headerMap.length; i++) {
		var x = headerMap[i].split(':',2);
		headers[x[0]] = x[1];
	}
	headers.Cookie = registry[tokenId].token;


	var contentLength = headers['content-length'];

	var transform = false; // new Nacl(null, contentLength);

	// JSON, response to /dir/, UTF-8.
	if(typeof(data) == 'string') {
		contentLength = data.length;
		headers['content-length'] = contentLength;
		data = new BufferStream(null, data);

// NOTES: This provides an extension mechanism but is not formalized.
		/* Prototype: encrypt a folder listing */
		if(false && transform) {
			var handshakePub = null;
			return data.pipe(transform).pipe(BufferStream.readSync(function(buffer) {
				var data = [];
				var output = buffer.toString('base64');
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


		var internalStream = this.stream(streamId, data, headers);
		if(internalStream) {
			console.log("post to stream ID", streamId);
			return internalStream;
		}

		headers['origin'] = this.baseUri;
		// FIXME: stdout is used for debugging.
		return data.pipe(route.post(uri, { headers: headers })).pipe(process.stdout);
	}
};


module.exports = Fio;

/*
 * Fluent interface for an otherwise unstable API.
 * Open a new session then respond to list and blob requests.
 *
 */
var simple = function(baseUri, onReady, onError, onListRequest, onBlobRequest) {
	var fio = new Fio(baseUri);
	var baseChannel = null;
	fio.watch().then(function(channel) {
		baseChannel = channel;
		// could get re-opened...
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

	var exports = {
		onError: function(handler) { onError = handler; return this; },
		onList: function(list) { onListRequest = list; return this; },
		onBlob: function(blob) { onBlobRequest = blob; return this; },
		asChannel: function() { return baseChannel; },
		fio: fio
	};
	return exports;
};
Fio.prototype.simple = function(cb, baseUri) {
	var baseUri = baseUri || this.baseUri;
	return simple(baseUri, /*onReady*/ cb, /*onError*/ cb);
};
Fio.simple = function(cb, baseUri) {
	return simple(baseUri, cb, cb);
};
// Perhaps a promise interface would be nice as well.
