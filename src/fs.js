/*
 *
 * Minimal compatibility with node.js fs interfaces.
 * See folders-local for the inverse.
 *
 */

// FIXME: May have some overlap with ssh copyright, fix if necessary..

var constants = require('constants');
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

FoldersFs.prototype.stat = function(path, callback) {

};

FoldersFs.prototype.unlink = function(path, callback) {

};

FoldersFs.prototype.readdir = function(path, callback) {

};

// May be a NOOP with some providers, though a temporary session could exit.
FoldersFs.prototype.mkdir = function(path, callback) {

};

FoldersFs.prototype.open = function(path, flags, modeOrCallback, callback) {

};

// Likely a NOOP
FoldersFs.prototype.close = function(fd, callback) {
};

FoldersFs.prototype.rmdir = function(path, callback) {
};

FoldersFs.prototype.rmdir = function(path, callback) {
};

FoldersFs.prototype.rename = function(path, newPath, callback) {
}

module.exports = FoldersFs;

