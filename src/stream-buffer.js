// Read a string or buffer as a stream.
import { Readable, Writable } from 'stream';

class BufferStream extends Readable {
	constructor(options, buf) {
		super(options);
		if(!(buf instanceof Buffer)) {
			if(buf instanceof Array) {
				this.isArray = true;
			}
			else {
				buf = Buffer.from(buf);
			}
		}
		this.buf = buf;
	}

	_read(n) {
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
	}

	static readSync(cb) {
		const data = new Writable();
		let len = 0;
		const chunks = [];
		data._write = (chunk, encoding, callback) => {
			console.log('got %d bytes of data', chunk.length);
			len += chunk.length;
			chunks.push(chunk);
			callback();
		};
		data.on('finish', () => {
			const buffer = Buffer.concat(chunks);
			cb(buffer);
		});
		return data;
	}
}

export default BufferStream;
