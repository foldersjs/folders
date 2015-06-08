/*
 *
 * Minimal compatibility with node.js fs interfaces.
 * See folders-local for the inverse.
 *
 * Partial implementation of: https://nodejs.org/api/fs.html
 */

// FIXME: May have some overlap with ssh copyright, fix if necessary..

var constants = require('constants');
var path = require('path')



function Stats(obj) {
	this.mode = (obj && obj.mode);
	this.permissions = this.mode;
	this.uid = (obj && obj.uid);
	this.gid = (obj && obj.gid);
	this.size = (obj && obj.size);
	this.atime = (obj && obj.atime);
	this.mtime = (obj && obj.mtime);
}
Stats.prototype.asMode = function(property) {
	return ((this.mode & constants.S_IFMT) === property);
};
Stats.prototype.isDirectory = function() {
	return this.asMode(constants.S_IFDIR);
};
Stats.prototype.isFile = function() {
	return this.asMode(constants.S_IFREG);
};
Stats.prototype.isBlockDevice = function() {
	return this.asMode(constants.S_IFBLK);
};
Stats.prototype.isCharacterDevice = function() {
	return this.asMode(constants.S_IFCHR);
};
Stats.prototype.isSymbolicLink = function() {
	return this.asMode(constants.S_IFLNK);
};
Stats.prototype.isFIFO = function() {
	return this.asMode(constants.S_IFIFO);
};
Stats.prototype.isSocket = function() {
	return this.asMode(constants.S_IFSOCK);
};

var folder_attr = {
	mode : 0755 | constants.S_IFDIR,
	size : 10 * 1024,
	uid : 9001,
	gid : 9001,
	atime : (Date.now() / 1000) | 0,
	mtime : (Date.now() / 1000) | 0
};

var FoldersFs = function(provider) {

this.provider = provider

};




FoldersFs.prototype.stat = function(uri , callback) {

	var self = this;



//{ mode, isDirectory(), size, mtime }

	uri = path.normalize(uri);
	var dirname = path.dirname(uri)
	var basename = path.basename(uri)

// NOTES: Upstream could apparently use stat() style method to always return one result.
// NOTES: We could cache these results as node FS pattern is to run readdir then stat on each result.


  self.provider.ls(dirname, function(res,err) {

	if(uri == ".") {
		callback(null, new Stats(folder_attr));
		return;
	}


	if (!res) {
		console.log("error in fs.js stat() ",err);
		return callback(err,null);
	}
	  
	var stats;
	for (var i = 0 ; i < res.length ;++i) {
		 if (basename == res[i].name) {
			stats = res[i];
			break;
		 }
	}

	if(stats) {
		stats.mtime = stats.modificationTime;
		stats.mode = folder_attr.mode;
		stats.isDirectory = function() {
			if (stats.type == 'text/plain') //FIXME: why this hardcoded!
				return false;
			return true;
		};
		return callback(null,stats);
	}
	callback("file not found", null);
    });

};

FoldersFs.prototype.readFile = function(path,callback){
	// Asynchronously read the entire contents of a file. 

	var self = this
	self.provider.cat(path, function(res,err) {

		if (!res) {
			console.log("error in folderFs createReadStream() ",err);
			return callback(err);
		}
		
		var stream = res.stream;

		var data = null;	
		stream.on('data', function(chunk) {
			data+=chunk;
		});
		stream.on('end', function(){
			callback(null,data);
		});
		stream.on('error', function(err) {
			console.log("error in fs.js readFile() ",err);
			callback(err);
		});

	});
};

FoldersFs.prototype.writeFile = function(filename,data,callback){

	// Asynchronously writes data to a file, replacing 
	// the file if it already exists. data can be a string or a buffer.
	var self = this;
	self.provider.write(filename, data, function(res,err) {
		if(!res) {
			console.log("error in fs writeFile",err);
			return callback(err);
		}
		callback(null,res);
	});

}

// NOTES: Consider a result cache as stat is likely to be called on each result.
FoldersFs.prototype.readdir = function(uri,callback){
	 var self = this;
	 self.provider.ls(uri, function(res, error) {

		if (!res) {
			console.log("error in fs.js readdir ",err);
			return callback(err);
		}

		var files = [];

		for (var i=0 ; i<res.length; i++) {
			files[i] = res[i].name;
		}
		callback(null,files);

	 });
};



// convert from Folders cat to fs read stream
FoldersFs.prototype.createReadStream = function(path){

	var self = this;
	//return self.provider.cat(path)

	var pass =  new require('stream').PassThrough();

	self.provider.cat(path, function(res,err) {
		if (!res) {
			console.log("error in folderFs createReadStream() ",err);
			return callback(err);
		}
		var stream = res.stream;
		stream.pipe(pass);
	}); 
	
	return pass
}


FoldersFs.prototype.createWriteStream = function(path,options){
	
	var self = this
	
	var pass =  new require('stream').PassThrough()
	
    self.provider.write(path,pass,function(res){
		
		console.log(res)
		
		
	})
	
	return pass 

	
}


// May be a NOOP with some providers, though a temporary session could exit.
FoldersFs.prototype.mkdir = function(uri, callback) {

	callback(null,new Error('not implemented'));	

};

FoldersFs.prototype.open = function(uri, flags, modeOrCallback, callback) {
	  var self = this 
	// only implementing flags for reading or writing
	//	duplex mode not available 
	
	if (flags in ['w']){

	self.createWriteStream(uri,function(res,err){
		
		if (!res){
			
			console.log("error in fs.js open() ",err)
			return callback(err)
			
		}
		
		callback(null,res.stream.id)
		
	})
	  
	  
	}
	 else {
		 
		 self.provider.cat(uri,function(res,err){
		  
		  if (!res){
			  
			  console.log("error in fs.js open()",err)
			  return callback(err)
			  
		  }
		  
		  callback(null,res.stream.fd)
		  
	  })
	 }  
	  

};

// Likely a NOOP
FoldersFs.prototype.close = function(fd, callback) {

 callback(null,new Error('not implemented'));	

 };




FoldersFs.prototype.unlink = function(path, callback) {

	callback(null,new Error('not implemented'));	

};


FoldersFs.prototype.rmdir = function(path, callback) {

	callback(null,new Error('not implemented'));	

};


FoldersFs.prototype.rename = function(path, newPath, callback) {
	callback(null,new Error('not implemented'));	

}

module.exports = FoldersFs;
