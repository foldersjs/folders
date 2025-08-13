/*
 *
 * Folders.io provider: share the local file system.
 *
 */
import fs from 'fs';
import path from 'path';
import mime from 'mime';

class LocalFio {
    constructor(prefix, options) {
        this.options = options || {};
        this.prefix = prefix || "/http_window.io_0:local/";
        this.rootDir = this.options.rootDir || ''; //root folder to display content
        console.log('localFio rootDir: ', this.rootDir);
    }

    static dataVolume() {
        return {
            RXOK: LocalFio.RXOK,
            TXOK: LocalFio.TXOK
        };
    }

    normalizePath(uri) {
        const prefix = this.prefix;
        const op = uri;
        if (uri != null && uri.indexOf('@') > -1) {
            const preuri = uri.substr(uri.indexOf('@') + 1).substr(prefix.length);
            uri = preuri;
        }

        if (this.rootDir !== '') { //append rootDir to this uri
            if (uri.indexOf('/') !== 0) {
                uri = '/' + uri;
            }
            uri = this.rootDir + uri;
        }

        console.log('new uri: ', uri);

        uri = path.resolve(path.normalize(uri || "."));
        return uri;
    }

    mkdir(path, cb) {
        fs.mkdir(this.normalizePath(path), cb);
    }

    cat(path, cb) {
        const uri = this.normalizePath(path);
        cat(uri, function (err, result) {
            if (err) {
                console.error("error in folders-local cat,", err);
                return cb(err, null);
            }
            cb(null, result);
        });
    }

    write(uri, data, cb) {
        uri = this.normalizePath(uri);
        write(uri, data, function (err, result) {
            if (err) {
                console.error("error in folders-local write,", err);
                return cb(err, null);
            }
            cb(null, result);
        });
    }

    ls(uri, cb) {
        console.log('local-fs ls', uri);
        const self = this;
        uri = this.normalizePath(uri);
        fs.stat(uri, function (err, stats) {
            if (err) {
                console.error("error in folders-local ls,", err);
                return cb(err, null);
            }
            if (!stats.isDirectory()) {
                const results = self.asFolders(uri, [stats]);
                return cb(null, results);
            }
            fs.readdir(uri, function (err, files) {
                const results = self.asFolders(uri, files);
                cb(null, results);
            });
        });
    }

    meta(uri, files, cb) {
        if (files === null) {
            cb("files not found", null);
            return;
        }
        let latch = files.length;
        for (let i = 0; i < files.length; i++) {
            (function (i) {
                fs.stat(path.resolve(uri, files[i].name), function (err, stats) {
                    latch--;
                    files[i].modificationTime = +stats.mtime;
                    if (stats.isDirectory()) {
                        files[i].extension = '+folder';
                        files[i].type = "";
                    } else {
                        files[i].size = stats.size;
                    }
                    if (latch == 0) {
                        cb(null, files);
                    }
                })
            })(i);
        }
    }

    asFolders(dir, files) {
        const out = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const o = {
                name: file
            };
            o.fullPath = path.relative('.', path.resolve(dir, o.name));
            o.uri = "#" + this.prefix + o.fullPath;
            o.size = 0;
            o.extension = path.extname(o.name).substr(1, path.extname(o.name).length - 1) || '+folder';
            o.type = (o.extension == '+folder' ? "" : mime.lookup(o.extension));
            o.modificationTime = +new Date();
            out.push(o);
        }
        return out;
    }

    dump() {
        return this.options;
    }
}

LocalFio.TXOK = 0;
LocalFio.RXOK = 0;

const cat = function (uri, cb) {
    fs.stat(uri, function (err, stats) {
        if (err) {
            console.error("error in folders-local cat,", err);
            return cb(err, null);
        }
        if (stats.isDirectory()) {
            return cb("refused to cat directory", null);
        }
        const size = stats.size;
        const name = path.basename(uri);
        try {
            const file = fs.createReadStream(uri).on('open', function () {
                cb(null, {
                    stream: file,
                    size: size,
                    name: name
                });
            });
        } catch (e) {
            console.error("error in createReadStream,", e);
            cb("unable to read uri", null);
        }
    });
};

const write = function (uri, data, cb) {
    try {
        console.log("write to file: ", uri);
        const file = fs.createWriteStream(uri);
        if (data instanceof Buffer) {
            file.write(data, function () {
                file.end(function () {
                    cb(null, "write uri success");
                });
            });
        } else {
            file.on('close', function () {
                data.emit('close');
            });
            data.destroySoon = function () {
                file.destroySoon();
            }
            data.on('end', function () {
                cb(null, "write uri success");
            });
            data.on('error', function (err) {
                return cb(err);
            });
            data.pipe(file);
            data.on('data', function (d) {
                 LocalFio.RXOK =  LocalFio.TXOK += d.length;
            });
        }
    } catch (e) {
        console.error("error in createWriteStream,", e);
        cb("unable to write uri", null);
    }
}

export default LocalFio;