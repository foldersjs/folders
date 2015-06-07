/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * This file contains common utility functions 
 * which are used throughout this project
 *
 */
 
 
 
 
// Favored utility libraries.  
var jsonSafeStringify = require('json-stringify-safe')  


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

	
exports.safeStringify     = safeStringify
exports.uuid              = uuid
exports.isStringEmpty     = isStringEmpty