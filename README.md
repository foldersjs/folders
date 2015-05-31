Folders
=============

This node.js package implements the folders.io synthetic file system.

Folders may be based on a local file system, a remote file system, or another synthetic file system as provided by a module.
Additional providers are available and can be installed via "npm install folders-modulename".

For example: "npm install folders-ftp" will install an FTP module.


Folders Provider API
=============

any synthetic file system integrated as a folders-provider must implement following method.

###Constructor

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

```json
{
	// the connection string, format: ftp//username:password@host:port
	connectionString : "ftp://test:123456@localhost:3333",

	// the option to start up a embedded server when inin the folders, used in test/debug
	enableEmbeddedServer : true
}
```

- folders-ssh options

```json
{
	// the connection string, format: ssh//username:password@host:port
	connectionString : "ssh://test:123456@localhost:3334",

	// the option to start up a embedded server when inin the folders, used in test/debug
	enableEmbeddedServer : true
}
```

- folders-hdfs options
```json
{
	// the base url address for hdfs instance
	baseurl : "http://45.55.223.28/webhdfs/v1/data/",

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
 * @param files ,the file information.
 * @param err, the err message, the files will be null if err, please check the err before using the files information.
 */
cb(files,err);
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
 * @param result, json object including the stream, size, name information. example {stream: readableStream, size: 1024, name: "testfile"}
 * @param err, the err message of callback, the result param will be null if error, please check the err before using the result information.
 */
 cb(result,err)
```

Union Folders API
=============

Special provider which can serve content from several providers.
File systems are listed as named folders in the root directory.



