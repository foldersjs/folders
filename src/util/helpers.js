/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * This file contains common utility functions 
 * which are used throughout this project
 *
 */
 
 
 
 
// Favored utility libraries.  
var jsonSafeStringify = require('json-stringify-safe');
var crypto = require('crypto');

var RANDOM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/*
 *
 *
 */
 
function safeStringify (obj) {
  var ret
  try {
    ret = JSON.stringify(obj)
  } catch (e) {
    ret = jsonSafeStringify(obj)
  }
  return ret
}

/*
 *  Random share id generator  
 *
 */
var uuid = function() {
			var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
				var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;
				return v.toString(16);
			});
			return id;
		};

/*
 *  Exit process if required string
 *  is empty
 */
var isStringEmpty = function(string){
	if((typeof string == 'undefined' || string.length < 1 ) ){ 
		console.log('Wrong configuration during start up :');
 		process.exit(1);
	}		
};


/**
 * Random name generator based on crypto.
 * Adapted from http://blog.tompawlak.org/how-to-generate-random-values-nodejs-javascript
 *
 * @param {Number} howMany
 * @return {String}
 * @api private
 */
function _randomChars(howMany) {
  var
    value = [],
    rnd = null;

  // make sure that we do not fail because we ran out of entropy
  try {
    rnd = crypto.randomBytes(howMany);
  } catch (e) {
    rnd = crypto.pseudoRandomBytes(howMany);
  }

  for (var i = 0; i < howMany; i++) {
    value.push(RANDOM_CHARS[rnd[i] % RANDOM_CHARS.length]);
  }

  return value.join('');
}

function getTmpFilename() {
  return _randomChars(12);
}

	
exports.safeStringify     = safeStringify
exports.uuid              = uuid
exports.isStringEmpty     = isStringEmpty
exports.getTmpFilename    = getTmpFilename