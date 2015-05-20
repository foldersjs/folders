/*
 * Folders.io connectors and examples
 *
 * Dual-licensed by folders.io:
 * http://opensource.org/licenses/MIT
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 */


// FIXME: Wrap constructor: Api(route) with route.outbound and route.postal by default set to noop.
// Pluggable interfaces are not needed as a dependency until used.
// Only used for one method.
var stream = require('event-stream');
// Not yet used, not used here.
var backoff = require('backoff');
// route can provide outbound and backoff.
// stream can be moved out. postal interface is mostly limited in this use.



/*
 * Polyfill for promises: let's just implement a subset.
 */
var Promise = require('promise');


// FIXME: Can be moved to an extension library, as transform is supported.
/*
 * Messaging library: security and verification.
 * Special thanks to TweetNaCl public domain contributors.
 */
var nf = require('tweetnacl');
var handshakePub = nf.util.encodeBase64(nf.box.keyPair().publicKey);
// var Nacl = require('nacl-stream');
var Nacl = require('./util/stream-nacl.js');


// Read a string or buffer as a stream.
var util = require("util");
var Readable = require('stream').Readable;
var BufferStream = function(options, buf) {
	if (!(this instanceof BufferStream))
		return new BufferStream(options, buf);
	if(!(buf instanceof Buffer)) buf = new Buffer(buf);
	this.buf = buf;
	Readable.call(this, options);
};
util.inherits(BufferStream, Readable);
BufferStream.prototype._read = function(n) {
	this.push(this.buf);
	this.buf = null;
	this.push(null);
};


// Could take a route object which provides outbound, channel


/*
 *
 * Fio().watch returns a Promise for a [Postal.js] channel.
 *
 */


// FIXME: Make route the input argument to the constructor, supplying the full interface.
var outbound = require('request');
var postal = require('postal');
var route = require('./route');
route.channel = function(uri) { var channel = postal.channel(namespace); return channel; };
route.post = function(uri, opts) { return outbound.post(uri, { headers: headers }); };


var registry = {};
var providers = {};
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

// FIXME: Handle this better, provide the provider as the argument, or handle elsewhere.
Fio.prototype.provider = function(module, opts) {
	var create = function(prefix) {
		if(!(module in providers)) {
			providers[module] = require("./folders/folders-" + module);
		}
		var Provider = providers[module];
		return new Provider(prefix, opts);
	};
	var fn = {create: create};
	return fn;
};



Fio.prototype.watch = function(session, namespacePrefix) {
	var baseUri = this.baseUri;
	namespacePrefix = namespacePrefix || "io.folders.p2p.";

	var watch = function(session) {
		var namespace = namespacePrefix + session.shareId;
		registry[session.shareId] = session;

		return new Promise(function(ready, error) {
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

	var open = new Promise(function(ready, error) {
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

		/* Prototype: encrypt a folder listing */
		if(false && transform) {
			return data.pipe(transform).pipe(stream.mapSync(function(buffer) {
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
