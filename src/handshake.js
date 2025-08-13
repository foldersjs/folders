/*
 *
 * Simple handshake for share ids and session creation.
 *
 * Thanks to TweetNaCl public domain contributors and cjdns for the Double SHA512 "fc" scheme.
 * Creates a public/private key pair that can be used as an IPv6 address or other 128bit GUID.
 * Uses TweetNaCl to verify ownership of the public key and generate session keys.
 *
 */

import nacl from './lib/nacl-fast.min.js';
import qs from 'querystring';
import url from 'url';

const pair = function(prefix, fn) {
	if(!fn) fn = nacl.box.keyPair;
	if(!prefix) return fn();
	for(let i = 0; i < 1024; i++) {
		const attempt = fn();
		const dhash = nacl.hash(nacl.hash(attempt.publicKey));
		if(dhash[0] == prefix) {
			console.log(i, 'attempts');
			return attempt;
		}
	}
	return null;
};

const join = function(arr) {
	let pos = 0;
	const len = arr.length;
	for(let i = 0; i < len; i++) {
		pos += arr[i].length;
	}
	const out = new Uint8Array(pos);
	pos = 0;
	for(let i = 0; i < len; i++) {
		let tmp = arr[i];
		if (typeof(arr[i]) == 'string'){
			tmp = toArray(arr[i]);
		}
		out.set(tmp, pos);
		pos += arr[i].length;
	}
	return out;
};

const toArray = function( str) {
	const out = new Uint8Array(str.length);
	for (let i = 0; i < str.length; i++) {
		out[i]=str.charCodeAt(i);
	}
	return out;
}

const stringify = function(input, stopAt) {
	stopAt = stopAt || input.length;
	const str = [];
	for(let i = 0; i < stopAt; i++) {
		let ss = input[i].toString('16');
		if (ss.length < 2) ss = '0' + ss;
		str.push(ss);
	}
	return str.join('');
};

const decodeHexString = function(str) {
	const arr = [];
	for (let i = 0; i < str.length; i+=2) {
		arr.push(parseInt(str.substring(i, i+2), 16));
	}
	return new Uint8Array(arr);
}

const hash = function(input) {
	return nacl.hash(nacl.hash(input));
};

const endpoint = function(pair, orArr) {
	const input = hash(orArr ? orArr : pair.publicKey);
	return stringify(input, 32);
};

const sign = function(input, key) {
	if (typeof(input) == 'string') input = join([input]);
	console.log('sign', input, key);
	return nacl.sign.detached(input, key);
};

class HandshakeService {
	constructor() {
		this.nodes = {};
		this.session = {};
		this.bob = {'publicKey': decodeHexString('2af37d7af58b07a65ee6fca7cc1432fa15d0e9c06bce81cd86f4fecee1114b55'),
					'secretKey': decodeHexString('5cc4597497c702d665959146689ad832a0b43c79336751c1473e88df104707d4')};
		console.log('secretKey length: ',  this.bob.secretKey.length);
	}

	node(nodeId, input) {
		console.log("nodeId & input.length: ", nodeId, input.length);
		console.log('input: ', input);
		if(input.length == 96) {
			const verifier =  input.substr(0, 32);
			console.log('verifier: ', verifier);
			if (verifier!=nodeId) return false;
			const sessionKey = decodeHexString(input.substr(32, 64));
			console.log('sessionKey: ', sessionKey);
			if (typeof(this.session[nodeId]) == 'undefined')
				this.session[nodeId] = [];
			this.session[nodeId].push(sessionKey);
		}
		else if(input.length == 104) {
			console.log('extended handshake');
			const nonce = input.subarray(32, 32+24);
			const token = input.subarray(56, 104);
			input = input.subarray(0,32);
			const sessionKey = nacl.box.open(token, nonce, input, this.bob.secretKey);
			if (!sessionKey) {
				console.log('invalid service key');
				return false;
			}
			console.log('session public Key length: ', sessionKey.length);
			if (typeof(this.session[nodeId]) == 'undefined')
				this.session[nodeId] = [];
			this.session[nodeId].push(sessionKey);
			console.log('session count: ', this.session[nodeId].length);
		}
		else {
			console.log('unknown token!');
			return false;
		}
		if(!(nodeId in this.nodes)) {
			this.nodes[nodeId] = input;
		}
		return true;
	}

	verifySignature(req, signature) {
		let baseStringURI = oauthBaseStringURI(req);
		baseStringURI = qs.unescape(baseStringURI);
		console.log('baseStringURI: ', baseStringURI);
		const requestParameterString = oauthRequestParameterString(req);
		let baseString = req.method.toUpperCase() + "&" + qs.escape(baseStringURI);
		if  (requestParameterString!='') {
			baseString+="&" + qs.escape(requestParameterString);
		}
		console.log('baseString: ', baseString);
		console.log('signature: ', signature);
		const arrPath = join([baseString]);
		const arrSign = decodeHexString(signature);
		for (const nodeId in this.session) {
			console.log('nodeId: ', nodeId);
			for (let i = 0; i < this.session[nodeId].length; i++) {
				const k = this.session[nodeId][i];
				console.log("session: ", stringify(k));
				const res = nacl.sign.detached.verify(arrPath, arrSign, k);
				if (res) {
					console.log('request OK');
					return true;
				}
			}
		}
		return false;
	}

	verifyRequest(req) {
		  const auth = req.headers['authorization'];
		  console.log("Authorization Header is: ", auth);
		  if (!auth) {
			return false;
		  }

		const naclParams = {};
		if (auth && auth.match(/^NaCl\b/i)) {
			const params = auth.match(/[^=\s]+="[^"]*"(?:,\s*)?/g);
			for (let i = 0; i < params.length; i++) {
				const match = params[i].match(/([^=\s]+)="([^"]*)"/);
				const key = qs.unescape(match[1]);
				const value = qs.unescape(match[2]);
				naclParams[key] = value;
			}
		}
		else {
			console.log('not NaCl auth scheme!');
		}
		
		if (!this.verifySignature(req, naclParams['signature'])) {
			console.log("verifySignature failed");
			return false;
		}
		else {
			console.log('signature OK');
			return true;
		}
	}
}

function oauthBaseStringURI(req) {
	const scheme = req.connection.verifyPeer != undefined ? 'https' : 'http';
	let hostname = req.header('host').split(':')[0].toLowerCase();
	const port = parseInt(req.header('host').split(':')[1], 10);
	
	if ((port != NaN)
	    && (scheme != 'http' || port != 80)
	    && (scheme != 'https' || port != 443))
		hostname = hostname + ':' + port;

	return scheme + "://" + hostname + url.parse(req.originalUrl).pathname;
}

function oauthRequestParameterString(req) {
	const params = [];
	for (const key in req.query)
		if (key != '_')
			params.push([ qs.escape(key), qs.escape(req.query[key]) ]);
			
	if (req.is('application/x-www-form-urlencoded')) {
		for (const key in req.body)
			if (key!='_')
				params.push([ qs.escape(key), qs.escape(req.body[key]) ]);
	}

	params.sort();

	let paramString = "";
	for (let i = 0; i < params.length; i++)
		paramString += (paramString ? '&' : '') + params[i][0] + '=' + params[i][1];
	
	return paramString;
}

function createKeypair() {
	return pair(0xfc);
}

function registerNode(publicKey) {
	const nodeId = endpoint(publicKey);
}

function createHandshake(alice, bob) {
	const nonce = nacl.randomBytes(24);
	const timestamp = new Uint8Array(new Float64Array([new Date().getTime()]).buffer);
	nonce.set(timestamp);
 
	const session = nacl.sign.keyPair.fromSeed(alice.secretKey);
	const token = nacl.box(session.publicKey, nonce, bob.publicKey, alice.secretKey);
	const handshake = join([alice.publicKey, nonce, token]);
	return {'session': session, 'handshake': stringify(handshake)};
}

function createSignal(path, restId, session) {
	const signal = stringify(join([restId, sign(path, session.secretKey)]));
	return signal;
}

function signRequest(path, session) {
	return stringify(sign(path, session.secretKey));
}

export {
	join,
	createKeypair,
	pair,
	endpoint,
	createHandshake,
	hash,
	stringify,
	signRequest,
	decodeHexString,
	HandshakeService
};
