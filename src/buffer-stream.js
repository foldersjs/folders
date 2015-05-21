// Read a string or buffer as a stream.
var util = require("util");
var Readable = require('stream').Readable;
var BufferStream = function(options, buf) {
	if (!(this instanceof BufferStream))
		return new BufferStream(options, buf);
	if(!(buf instanceof Buffer)) {
		if(buf instanceof Array) {
			// Assume the array is of Buffer objects.
			this.isArray = true;
		}
		else {
			buf = new Buffer(buf);
		}
	}
	this.buf = buf;
	Readable.call(this, options);
};
module.exports = BufferStream;

// Read a stream into an array .
var Stream = require('stream').Writable;
BufferStream.readSync = function(cb) {
	var data = new Stream();
	var len = 0; var chunks = [];
	data.on('data', function(chunk) {
		console.log('got %d bytes of data',
		len += chunk.length;
		chunks.push(data);
	});
	data.on('end', function() {
		fileSystem[uri] = { size: len, data: chunks };
		cb(null, "write uri success");
	});
	return data;
};

util.inherits(BufferStream, Readable);
BufferStream.prototype._read = function(n) {
	if(this.isArray) {
		if(!(this.buf && this.buf.length)) {
			this.buf = null;
			this.push(null);
		}
		this.push(this.buf.shift());
		return;
	}
	this.push(this.buf);
	this.buf = null;
	this.push(null);
};

