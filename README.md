Folders
=============

The Folders node.js package provides a filesystem abstraction for synthetic file systems.

Folders may be based on a local file system, a remote file system, or another synthetic file system as provided by a module.
Additional providers are available and can be installed via "npm install folders-modulename".

For example: "npm install folders-ftp" will install an FTP module. The module comes with an FTP client and server,
enabling Folders to use Folders on a remote system, and to provide access to folders over the FTP protocol to clients.

You need to install the gulp tasker module by command "npm install --global gulp". Then you can go to src and run "gulp test". That will run the test directory test cases.  

The core project is available under the Apache 2.0 or MIT licenses. Modules and their dependencies may have different license requirements.

Folders Provider API
=============

Folders providers must implement the following methods:

### Constructor

Provider constructor, could pass the special option/param in the opts param.

```js
/**
 * @param Prefix, folders prefix
 * @param opts, options, example connectionString for ftp
 */
Provider(prefix, opts)
```

some options for exist folders provider.

- folders-ftp options

```js
{
	// the connection string, format: ftp//username:password@host:port
	connectionString : "ftp://test:123456@localhost:3333",

	// the option to start up a embedded server when inin the folders, used in test/debug
	enableEmbeddedServer : true
}
```

- folders-ssh options

```js
{
	// the connection string, format: ssh//username:password@host:port
	connectionString : "ssh://test:123456@localhost:3334",

	// the option to start up a embedded server when inin the folders, used in test/debug
	enableEmbeddedServer : true
}
```

- folders-hdfs options
```js
{
	// the base url address for hdfs instance
	baseurl : "http://webhdfs.node/webhdfs/v1/data/",

	// the username to access the hdfs instances
	username : 'hdfs'
}

```

###ls

ls dir 

```js
/**
 * @param uri, the uri to ls
 * @param cb, callback function. 
 */
ls(uri, cb)

//the param of the cb function
/**
 * @param err, the err message, the files will be null if err, please check the err before using the files information.
 * @param files ,the file information if success
 */
cb(err, files);
```

###cat

cat file

```js
/**
 * @param uri, the file uri to cat 
 * @param cb, callback function. 
 */
cat(uri, cb);

//the callback function
/**
 * @param err, the err message of callback, the result param will be null if error, please check the err before using the result information.
 * @param result, json object including the stream, size, name information. example {stream: readableStream, size: 1024, name: "testfile"}
 */
 cb(err, result)
```

### write

write file to file system

```js
/**
 * @param path, string, the path 
 * @param data, the input data, 'stream.Readable' or 'Buffer'
 * @param cb, the callback function
 */
write(path,data,cb);

//the callback function
/**
 * @param err, the err message of callback, the result param will be null if error, please check the err before using the result information.
 * @param result, string message, example, "write success"
 */
cb(err, result);

``` 

Union Folders API
=============

This is a unique interface which can serve content from several providers.
File systems are listed as named folders in the root directory.

For example, to setup a union file system testing several folders providers:

```sh
npm install folders
npm install folders-ftp
npm install folders-ssh
```

```js
var mounts = [
	{ "stub" : fio.provider("stub") },
	{ "local" : fio.provider("local") },
	{ "memory" : fio.provider("memory") },
	{ "ftp" : fio.provider("ftp", {
                connectionString : "ftp://test:123456@localhost:3333",
                enableEmbeddedServer : true
        }) },
        { "ssh" : fio.provider("ssh", {
                connectionString : "ssh://test:123456@localhost:3334",
                enableEmbeddedServer : true
        }) }
];

var Fio = require('folders');
var unionfs = new ((Fio.union())(fio, mounts, {
	"view" : "list"
}));

unionfs.ls('.', function(data) {
	// will list the five modules listed as root folders.
});
```
