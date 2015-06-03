/*
 *
 * Minimal compatibility with node.js fs interfaces.
 * See folders-local for the inverse.
 *
 */

// FIXME: May have some overlap with ssh copyright, fix if necessary..

var constants = require('constants');

var LocalFs = require('./folders-local')
//testing purposes only 
var provider = new LocalFs()

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

var FoldersFs = function() {


};




FoldersFs.prototype.stat = function(uri , callback) {


/*
 * A normal stat record 
 { dev: -2072562183,
  mode: 16822,
  nlink: 1,
  uid: 0,
  gid: 0,
  rdev: 0,
  blksize: undefined,
  ino: 1407374883769160,
  size: 0,
  blocks: undefined,
  atime: Tue Jun 02 2015 15:56:13 GMT+0530 (India Standard Time),
  mtime: Tue Jun 02 2015 15:56:13 GMT+0530 (India Standard Time),
  ctime: Tue Jun 02 2015 15:56:13 GMT+0530 (India Standard Time),
  birthtime: Tue Jun 02 2015 13:22:25 GMT+0530 (India Standard Time) }
 */


};

FoldersFs.prototype.readFile = function(filename,callback){
	
	//Asynchronously reads the entire contents of a file. 
	
	provider.cat(filename,function(res,err){
		
		if (!res){
			
			console.log("error in fs readFile() ",err)
			return callback(null,err)
		}
		
		var file = res.stream
		
		if (file.isPaused()){
			file.resume()
		}
		
		var data ;
		file.on('data',function(chunk){
			
			data+=chunk
			
		})
		
		file.on('end',function(){
			
			callback(data)
			
		})
		
		file.on('error',function(){
			
			
			console.log("error in fs readFile() ",err)
			return callback(null,err)
			
		})
		
	})
	
}

Folders.prototype.writeFile = function(filename,data,callback){
	
	// Asynchronously writes data to a file, replacing 
	// the file if it already exists. data can be a string or a buffer.
	
	provider.write(filename,data,function(res,err){
		
		if (!res){
			console.log("error in fs writeFile",err)
			return callback(null,err)
			
		}
		callback(res)
		
	})
	
	
}

FoldersFs.prototype.readdir = function(uri,callback){
	
	 provider.ls(uri,function(res,error){
		 
		 if (!res){
			 console.log("error in fs.js readdir ",err)
			 return callback(null,err)
		 }
		 
		 var files = []

		 for (var i = 0 ; i < res.length ; ++i)
				files[i] = res[i].name	
			
		callback(files)	
		 
	 })
};



// convert from Folders cat to fs read stream
FoldersFs.prototype.createReadStream = function(path,callback){
	
	  provider.cat(path, function(res,err) {

			if (!res){
				
				console.log("error in folderFs createReadStream() ",err)
				return (null,err)
				
			}
	  callback(res.stream); 
	  }) 
	
}

FoldersFs.prototype.createWriteStream = function(path,data,callback){
	
	provider.write(path,data,function(res,err){
		
		if (!res){
			
			console.log("error in folderFs createWriteStream ",err)
			return callback(null,err)
			
		}
		callback(res)
		
	})
}

// May be a NOOP with some providers, though a temporary session could exit.
FoldersFs.prototype.mkdir = function(uri, callback) {

	callback(new Error('not implemented'));	

};

FoldersFs.prototype.open = function(uri, flags, modeOrCallback, callback) {

	  callback(new Error('not implemented'));	

};

// Likely a NOOP
FoldersFs.prototype.close = function(fd, callback) {

 callback(new Error('not implemented'));	
};




FoldersFs.prototype.unlink = function(path, callback) {

	callback(new Error('not implemented'));	

};


FoldersFs.prototype.rmdir = function(path, callback) {

	callback(new Error('not implemented'));	

};


FoldersFs.prototype.rename = function(path, newPath, callback) {
	callback(new Error('not implemented'));	

}

module.exports = FoldersFs;

