/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 *
 * This file contains common utility functions 
 * which are used throughout this project
 *
 */
 
import jsonSafeStringify from 'json-stringify-safe';
import crypto from 'crypto';

const RANDOM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function safeStringify (obj) {
  let ret
  try {
    ret = JSON.stringify(obj)
  } catch (e) {
    ret = jsonSafeStringify(obj)
  }
  return ret
}

export const uuid = function() {
	const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
		const r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;
		return v.toString(16);
	});
	return id;
};

export const isStringEmpty = function(string){
	if((typeof string == 'undefined' || string.length < 1 ) ){ 
		console.log('Wrong configuration during start up :');
 		process.exit(1);
	}		
};

function _randomChars(howMany) {
  let
    value = [],
    rnd = null;

  try {
    rnd = crypto.randomBytes(howMany);
  } catch (e) {
    rnd = crypto.pseudoRandomBytes(howMany);
  }

  for (let i = 0; i < howMany; i++) {
    value.push(RANDOM_CHARS[rnd[i] % RANDOM_CHARS.length]);
  }

  return value.join('');
}

export function getTmpFilename() {
  return _randomChars(12);
}