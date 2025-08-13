/*
 *
 * Minimal compatibility with node.js fs interfaces.
 * See folders-local for the inverse.
 *
 * Partial implementation of: https://nodejs.org/api/fs.html
 */
import constants from 'constants';
import path from 'path';
import { PassThrough } from 'stream';

class Stats {
    constructor(obj) {
        this.mode = (obj && obj.mode);
        this.permissions = this.mode;
        this.uid = (obj && obj.uid);
        this.gid = (obj && obj.gid);
        this.size = (obj && obj.size);
        this.atime = (obj && obj.atime);
        this.mtime = (obj && obj.mtime);
    }

    asMode(property) {
        return ((this.mode & constants.S_IFMT) === property);
    }
    isDirectory() {
        return this.asMode(constants.S_IFDIR);
    }
    isFile() {
        return this.asMode(constants.S_IFREG);
    }
    isBlockDevice() {
        return this.asMode(constants.S_IFBLK);
    }
    isCharacterDevice() {
        return this.asMode(constants.S_IFCHR);
    }
    isSymbolicLink() {
        return this.asMode(constants.S_IFLNK);
    }
    isFIFO() {
        return this.asMode(constants.S_IFIFO);
    }
    isSocket() {
        return this.asMode(constants.S_IFSOCK);
    }
}

const folder_attr = {
    mode: 0755 | constants.S_IFDIR,
    size: 10 * 1024,
    uid: 9001,
    gid: 9001,
    atime: (Date.now() / 1000) | 0,
    mtime: (Date.now() / 1000) | 0
};

class FoldersFs {
    constructor(provider) {
        this.provider = provider;
        console.log("inin foldersFs");
    }

    stat(uri, callback) {
        console.log('stat', uri);
        const self = this;
        uri = path.normalize(uri);
        const dirname = path.dirname(uri);
        const basename = path.basename(uri);
        if (uri == '.' || uri == '/') {
            callback(null, new Stats(folder_attr));
            return;
        }
        self.provider.ls(dirname, function (err, res) {
            if (err) {
                console.log("error in fs.js stat() ", err);
                return callback(err, null);
            }
            let stats;
            for (let i = 0; i < res.length; ++i) {
                console.log('extension: ', res[i].extension);
                if (basename == res[i].name || (res[i].extension == "+folder" && basename + "/" == res[i].name)) {
                    stats = res[i];
                    break;
                }
            }
            if (stats) {
                if (typeof (stats.modificationTime) == 'undefined') {
                    stats.mtime = Date.now() / 1000;
                } else {
                    stats.mtime = stats.modificationTime;
                }
                stats.mode = folder_attr.mode;
                stats.isDirectory = function () {
                    return stats.extension == "+folder";
                };
                return callback(null, stats);
            } else {
                console.log('stats not found, DEBUG:');
                for (let i = 0; i < res.length; ++i) {
                    console.log(res[i].name);
                }
            }
            return callback("file not found", null);
        });
    }

    readFile(path, callback) {
        const self = this;
        self.provider.cat(path, function (err, res) {
            if (err) {
                console.log("error in folderFs readFile() ", err);
                return callback(err);
            }
            const stream = res.stream;
            let data = '';
            stream.on('data', function (chunk) {
                data += chunk;
            });
            stream.on('end', function () {
                callback(null, data);
            });
            stream.on('error', function (err) {
                console.log("error in fs.js readFile() ", err);
                callback(err);
            });
        });
    }

    writeFile(filename, data, callback) {
        const self = this;
        self.provider.write(filename, data, function (err, res) {
            if (err) {
                console.log("error in fs writeFile", err);
                return callback(err);
            }
            callback(null, res);
        });
    }

    readdir(uri, callback) {
        console.log('readdir: ', uri);
        const self = this;
        self.provider.ls(uri, function (err, res) {
            if (err) {
                console.log("error in fs.js readdir ", err);
                return callback(err);
            }
            const files = [];
            for (let i = 0; i < res.length; i++) {
                files[i] = res[i].name;
            }
            callback(null, files);
        });
    }

    createReadStream(path) {
        const self = this;
        const pass = new PassThrough();
        self.provider.cat(path, function (err, res) {
            if (err) {
                console.log("error in folderFs createReadStream() ", err);
                pass.emit('error', err);
            } else {
                const stream = res.stream;
                stream.pipe(pass);
            }
        });
        return pass;
    }

    createWriteStream(path, options) {
        console.log('folderfs createWriteStream', path);
        const self = this;
        const pass = new PassThrough();
        pass.on("end", function () {
            console.log('stream end');
        });
        pass.on("close", function () {
            console.log('stream close');
        });
        pass.destroySoon = function () {
            //console.log('destroySoon called');
        }
        self.provider.write(path, pass, function (err, res) {
            if (err) {
                console.log("error in folderFs createWritetream() ", err);
            }
        });
        return pass;
    }

    mkdir(uri, callback) {
        callback(null, new Error('not implemented'));
    }

    open(uri, flags, modeOrCallback, callback) {
        const self = this;
        if (flags in ['w']) {
            self.createWriteStream(uri, function (res, err) {
                if (!res) {
                    console.log("error in fs.js open() ", err);
                    return callback(err);
                }
                callback(null, res.stream.id);
            });
        } else {
            self.provider.cat(uri, function (res, err) {
                if (!res) {
                    console.log("error in fs.js open()", err);
                    return callback(err);
                }
                callback(null, res.stream.fd);
            });
        }
    }

    close(fd, callback) {
        callback(new Error('not implemented'), null);
    }

    unlink(path, callback) {
        const self = this;
        self.provider.unlink(path, callback);
    }

    rmdir(path, callback) {
        const self = this;
        self.provider.rmdir(path, callback);
    }

    rename(path, newPath, callback) {
        callback(new Error('not implemented'), null);
    }
}

export default FoldersFs;