/*
 *
 * Special provider which can serve content from several providers.
 * File systems are listed as named folders in the root directory.
 *
 */
import { Readable } from 'stream';

class UnionFio {
    constructor(fio, prefix) {
        this.fio = fio;
        this.prefix = prefix || "/http_folders.io_0:union/";
        this.fuse = {};
    }

    static async create(fio, mounts, opts, prefix) {
        const union = new UnionFio(fio, prefix);
        for (let i = 0; i < mounts.length; ++i) {
            const mount = mounts[i];
            for (const name in mount) {
                if (mount.hasOwnProperty(name)) {
                    if (!union.fuse[name]) {
                        const provider = name;
                        const o = await mount[name].create(union.prefix);
                        union.fuse[provider] = o;
                    } else {
                        console.log("union setup: Error! " + name + " already mounted");
                    }
                }
            }
        }
        return union;
    }

    asView(path, viewfs) {
        if (path.substr(0, 1) != "/") path = "/" + path;
        const subpos = path.indexOf("/", 1);
        const root = subpos > -1 ? path.substr(0, subpos) : path;
        const name = root.substr(1);
        if (!(name in viewfs)) {
            return false;
        }
        const rootfs = viewfs[name];
        const subpath = subpos > -1 ? path.substr(subpos) : "/";
        return {
            name: name,
            base: rootfs,
            path: subpath
        }
    }

    onList(data) {
        const fio = this.fio;
        const o = data.data;
        const uri = normalizePath(this.prefix, o.path);
        const lsMime = ["Content-Type:application/json"];
        this.ls(uri, data, function (files, err) {
            if (err) {
                return fio.post(o.streamId, null, lsMime, data.shareId);
            }
            fio.post(o.streamId, JSON.stringify(files), lsMime, data.shareId);
        });
    }

    cp(source, destination, cb) {
        const paths = this.fuse;
        if (source == "" || source.substr(0, 1) != "/")
            source = "/" + source;
        if (destination == "" || destination.substr(0, 1) != "/")
            destination = "/" + destination;
        const sourceProvider = this.asView(source, paths);
        const destinationProvider = this.asView(destination, paths);
        if (!sourceProvider || !sourceProvider.base) {
            return cb("union cp: missing source file operand ");
        }
        if (!destinationProvider || !destinationProvider.base) {
            return cb("union cp: missing destination file operand");
        }
        const sourceMount = sourceProvider.base;
        const sourceUri = sourceProvider.path;
        const destinationMount = destinationProvider.base;
        const destinationUri = destinationProvider.path;
        if (sourceMount === destinationMount && sourceUri === destinationUri) {
            return cb("Error! Both Source and destination are same ");
        }
        sourceMount.cat(sourceUri, function (err, source_r) {
            const file = source_r.stream;
            destinationMount.write(destinationUri, file, function (err) {
                if (err) {
                    console.log("error occured in union cp() ", err);
                    return cb(err);
                }
                cb();
            });
        });
    }

    umount(mountPoint) {
        const self = this;
        if (mountPoint in self.fuse) {
            delete self.fuse[mountPoint];
        } else {
            console.log("union umount: Error! nothing to umount");
        }
    }

    ls(path, cb) {
        const self = this;
        const paths = this.fuse;
        const multicast = false;
        let out = [];
        if (path == "" || path.substr(0, 1) != "/")
            path = "/" + path;
        if (path == "" || path.substr(-1) != "/")
            path = path + "/";
        if (multicast) {
            for (const i in paths) {
                const mount = paths[i];
                const uri = normalizePath(mount.prefix, path);
                console.log("mount ls ", uri, mount.prefix);
                mount.ls(uri, function (err, files) {
                    if (err) {
                        console.log("error listing files,", uri, err);
                        return cb(err);
                    }
                    if (mount.meta)
                        mount.meta(uri, files, function (err, files) {
                            cb(null, files);
                        });
                    else
                        cb(null, files);
                });
            }
            return;
        }
        if (path == "/") {
            const mounts = [];
            for (const i in paths) {
                mounts.push(i);
            }
            const mountsAsFolders = providerAsFolders('/', mounts);
            cb(null, mountsAsFolders);
        } else {
            const parts = this.asView(path, paths);
            if (!parts || !parts.base) {
                console.log("could not find path", path);
                return;
            }
            const mount = parts.base;
            const uri = parts.path;
            mount.ls(uri, function (err, data) {
                if (err) {
                    return cb(err);
                }
                for (let i = 0; i < data.length; i++) {
                    data[i].uri = '/' + parts.name + data[i].uri;
                    data[i].fullPath = '/' + parts.name + data[i].fullPath;
                }
                cb(null, data);
            });
        }
    }

    cat(data, cb) {
        const paths = this.fuse;
        const multicast = false;
        let path = data;
        if (typeof(data) === 'object'){
          path = data.path;
        }
        if (path == "" || path.substr(0, 1) != "/")
            path = "/" + path;
        if (multicast) {
            for (const i in paths) {
                const mount = paths[i];
                const uri = normalizePath(mount.prefix, path);
                mount.cat(uri, function (result, err) {
                    if (err) {
                        console.log("cat file error,", uri, err);
                        return cb(null, err);
                    }
                    cb(result);
                });
            }
            return;
        }
        const provider = this.asView(path, paths);
        if (!provider || !provider.base) {
            return cb(new Error("union cat: missing source file operand "));
        }
        const mount = provider.base;
        const uri = provider.path;
        let catParam = uri;
        if (typeof(data) !== 'string' && mount.features && mount.features.range_cat){
          catParam = {
              path: uri,
              offset: data.offset,
              length: data.length
          };
        }
        mount.cat(catParam, function (err, result) {
            if (err) {
                console.log("Error in union cat() " + err);
                return cb(err);
            }
            return cb(null, result);
        });
    }

    write(path, data, cb) {
        const paths = this.fuse;
        const multicast = false;
        if (path == "" || path.substr(0, 1) != "/")
            path = "/" + path;
        if (multicast) {
            if (data instanceof Readable) {
                data.pause();
            }
            for (const i in paths) {
                const mount = paths[i];
                const uri = normalizePath(mount.prefix, path);
                mount.write(uri, data, function (result, err) {
                    if (err) {
                        console.log("write file error ,", uri, err);
                        return cb(null, err);
                    }
                    cb(result);
                });
            }
            if (data instanceof Readable) {
                data.resume();
            }
            return;
        }
        const provider = this.asView(path, paths);
        if (!provider || !provider.base) {
            return cb(new Error("union cp: missing destination file operand"));
        }
        const mount = provider.base;
        const uri = provider.path;
        mount.write(uri, data, function (err) {
            if (err) {
                console.log("error occured in union write() ", err);
                return cb(err);
            }
            return cb();
        });
    }

    unlink(path, cb) {
        const paths = this.fuse;
        if (path == "" || path.substr(0, 1) != "/")
            path = "/" + path;
        const provider = this.asView(path, paths);
        if (!provider || !provider.base) {
            return cb(new Error("union unlink: missing destination file operand"));
        }
        const mount = provider.base;
        const uri = provider.path;
        mount.unlink(uri, function (err, result) {
            if (err) {
                console.log("Error in union unlink() " + err);
                return cb(err);
            }
            return cb(null, result);
        });
    }

    feature(path, feature) {
        const paths = this.fuse;
        if (path == "" || path.substr(0, 1) != "/")
            path = "/" + path;
        const provider = this.asView(path, paths);
        if (!provider || !provider.base) {
            return cb(new Error("union cp: missing destination feature operand"));
        }
        const mount = provider.base;
        const uri = provider.path;
        if (mount.features && mount.features[feature])
            return true;
        return false;
    }
}

const normalizePath = function (prefix, path) {
    if (path != null && path.indexOf('@') > -1) {
        const preuri = path.substr(path.indexOf('@') + 1).substr(prefix.length);
        path = preuri;
    }
    return path;
};

const providerAsFolders = function (dir, providers) {
    const data = [];
    for (let i = 0; i < providers.length; ++i) {
        const o = {};
        o.name = providers[i];
        o.extension = '+folder';
        o.size = 0;
        o.type = "";
        o.fullPath = dir + o.name;
        o.uri = o.fullPath;
        if (!o.meta)
            o.meta = {};
        if (!o.meta) o.meta = {
            'group': 'union',
            'owner': 'union',
            'permission': 0
        };
        o.modificationTime = Date.now();
        data.push(o);
    }
    return data;
};

export default UnionFio;