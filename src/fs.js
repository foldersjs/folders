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
	console.log("inin foldersFs");
};




FoldersFs.prototype.stat = function(uri , callback) {
	
	console.log('stat', uri);

	var self = this;



//{ mode, isDirectory(), size, mtime }

	uri = path.normalize(uri);
	
	var dirname = path.dirname(uri);
	var basename = path.basename(uri);
	
	
	
	if (uri == '.'  || uri == '/') { //allow browsing root and current dir
		callback(null, new Stats(folder_attr));
		return;
	}

// NOTES: Upstream could apparently use stat() style method to always return one result.
// NOTES: We could cache these results as node FS pattern is to run readdir then stat on each result.

    self.provider.ls(dirname, function(err, res) {
		if (err) {
			console.log("error in fs.js stat() ",err);
			return callback(err,null);
		}
		  
		
		var stats;
		for (var i = 0 ; i < res.length ;++i) {
			console.log('extension: ', res[i].extension);
			 if (basename == res[i].name || (res[i].extension == "+folder" && basename + "/" == res[i].name)) {
				stats = res[i];
				break;
			 }
		}
		
		//console.log('stats, file found!', stats);
	
		if(stats) {
			if (typeof(stats.modificationTime) == 'undefined') {
				stats.mtime = Date.now() / 1000;	
			}
			else{
				stats.mtime = stats.modificationTime;;
			}
			stats.mode = folder_attr.mode;
			stats.isDirectory = function() {
				//if (stats.type == 'text/plain') //FIXME: why this hardcoded!
				//	return false;
				return stats.extension == "+folder";
				//return true;
			};
			console.log('stats: ', stats);
			return callback(null,stats);
		}
		else {
			console.log('stats not found, DEBUG:');
			for (var i = 0 ; i < res.length ;++i) {
				console.log(res[i].name);
			}
		}
		return callback("file not found", null);
    });

};

FoldersFs.prototype.readFile = function(path,callback){
	// Asynchronously read the entire contents of a file. 

	var self = this
	self.provider.cat(path, function(err, res) {
		if (err) {
			console.log("error in folderFs readFile() ",err);
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
	console.log('readdir: ', uri);
	 var self = this;
	 self.provider.ls(uri, function(err, res) {
		if (err) {
			console.log("error in fs.js readdir ",err);
			return callback(err);
		}

		var files = [];

		for (var i=0 ; i< res.length; i++) {
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
	
	self.provider.cat(path, function(err, res) {
		if (err) {
			console.log("error in folderFs createReadStream() ",err);
			//return callback(err);
			//FIXME: how to implement this correctly!?
			pass.emit('error', err);
		}
		else {
			var stream = res.stream;
			stream.pipe(pass);	
		}
		
	}); 
	
	return pass
}


FoldersFs.prototype.createWriteStream = function(path,options){
	
	console.log('folderfs createWriteStream', path);
	var self = this
	
	var pass =  new require('stream').PassThrough()
	
	pass.on("end", function() { console.log ('stream end'); } );
	pass.on("close", function() { console.log ('stream close'); } );
	
	pass.destroySoon = function() {
		//console.log('destroySoon called');
	}
	
	var fs = require('fs');
	//var tmp = fs.createReadStream('/Users/hai/Desktop/Music Sheets/if_youre_happy_leadsheet.pdf');
    self.provider.write(path,pass,function(err, res){
		if (err) {
			console.log("error in folderFs createWritetream() ",err);
		}
	})
	
	//return fs.createWriteStream('/Users/hai/Desktop/Music Sheets/out.pdf', options);
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

 callback(new Error('not implemented'),null);	

 };




FoldersFs.prototype.unlink = function(path, callback) {

	callback(new Error('not implemented'),null);	

};


FoldersFs.prototype.rmdir = function(path, callback) {

	callback(new Error('not implemented'),null);	

};


FoldersFs.prototype.rename = function(path, newPath, callback) {
	callback(new Error('not implemented'),null);	

}

module.exports = FoldersFs;
