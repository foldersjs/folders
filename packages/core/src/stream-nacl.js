/*
 * nacl-stream as a node.js stream.
 * Special thanks to TweetNacl public domain contributors.
 *
 */

import nacl from './lib/nacl-stream.min.js';
import { Transform } from 'stream';
import baseNacl from './lib/nacl-fast.min.js';

class Nacl extends Transform {
  constructor(options, len, hasUnbox) {
    super(options);

    const BOX_KEY = new Uint8Array(32);
    const BOX_NONCE = new Uint8Array(16);

    const FIFTEEN_KB = 2 << 15;
    const NACL_STREAM_INTEGER_SIZE = 4;
    const NACL_STREAM_NONCE_SIZE = 16;
    const NACL_STREAM_CHUNK_OVERHEAD = NACL_STREAM_INTEGER_SIZE + NACL_STREAM_NONCE_SIZE;

    this.buf = null;
    this.CHUNK_LENGTH = FIFTEEN_KB;
    this.CHUNK_OVERHEAD = NACL_STREAM_CHUNK_OVERHEAD;
    this.overheadLength = 0;
    this.totalLength = len || 0;

    if(hasUnbox) {
      this.transform = nacl.stream.createDecryptor(BOX_KEY, BOX_NONCE, this.CHUNK_LENGTH);
      this.transformChunk = function(data, i, chunkLen) {
        return Buffer.from(this.transform.decryptChunk(data.slice(i, i+chunkLen), false).subarray(0,chunkLen + this.CHUNK_OVERHEAD));
      };
      return;
    }

    if(this.totalLength > 0) this.overheadLength = this.CHUNK_OVERHEAD * Math.ceil(len / FIFTEEN_KB);
    this.transform = nacl.stream.createEncryptor(BOX_KEY, BOX_NONCE, this.CHUNK_LENGTH);
    this.transformChunk = function(data, i, chunkLen) {
      return Buffer.from(this.transform.encryptChunk(data.slice(i, i+chunkLen), false).subarray(0,chunkLen + this.CHUNK_OVERHEAD));
    };
  }

  _transform(data, encoding, callback) {
    const maxChunkLen = this.CHUNK_LENGTH;
    if(this.buf !== null) {
      data = Buffer.concat([this.buf, data]);
      this.buf = null;
    }
    for (let i = 0; i < data.length; i += maxChunkLen) {
      if(data.length - i < maxChunkLen) {
        this.buf = data.slice(i);
        break;
      }
      const chunkLen = maxChunkLen;
      if(!this.totalLength) this.overheadLength += this.CHUNK_OVERHEAD;
      this.push(this.transformChunk(data,i,chunkLen));
    }
    callback();
  }

  _flush(callback)  {
    if(this.buf !== null) {
      const i = 0;
      const chunkLen = this.buf.length;
      const data = this.buf;
      this.buf = null;
      this.push(this.transformChunk(data,i,chunkLen));
    }
    this.push(null);
    this.transform.clean();
    callback();
  }

  static base = baseNacl;
}

export default Nacl;
