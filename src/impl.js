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
route.Promise = Promise;
