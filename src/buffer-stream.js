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

