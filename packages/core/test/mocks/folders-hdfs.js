import { vi } from 'vitest';

export default class HDFSMock {
  constructor() {
    this.ls = vi.fn(this._ls.bind(this));
    this.cat = vi.fn(this._cat.bind(this));
    this.write = vi.fn(this._write.bind(this));
    this.mkdir = vi.fn(this._mkdir.bind(this));
    this.files = {};
  }

  _ls(uri, cb) {
    cb(null, Object.values(this.files));
  }

  _cat(uri, cb) {
    cb(null, { stream: this.files[uri].stream });
  }

  _write(path, data, cb) {
    const name = path.split('/').pop();
    this.files[path] = {
      name: name,
      fullPath: path,
      uri: path,
      stream: data,
      size: 11, // 'hello world'.length
      extension: name.split('.').pop()
    };
    cb(null, 'write success');
  }

  _mkdir(path, cb) {
    cb(null, 'mkdir success');
  }
}
