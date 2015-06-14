/*
 *
 * Simple handshake for share ids and session creation.
 *
 * Thanks to TweetNaCl public domain contributors and cjdns for the Double SHA512 "fc" scheme.
 * Creates a public/private key pair that can be used as an IPv6 address or other 128bit GUID.
 * Uses TweetNaCl to verify ownership of the public key and generate session keys.
 *
 */


/*
 32 byte pubkey ( fc == sha512d(pubkey)[0] )
 24 byte nonce (8 byte timestamp + 16 byte random)
 48 byte handshake ( 32 byte sigkey, 16 byte signed by pubkey)
*/

var nacl = require('./lib/nacl-fast.min');

var pair = function(prefix, fn) {
	if(!fn) fn = nacl.box.keyPair;
	if(!prefix) return fn();
	// can easily take more than 1024 guesses; 1/256 chance.
	for(var i = 0; i < 1024; i++) {
		var attempt = fn();
		var dhash = nacl.hash(nacl.hash(attempt.publicKey));
		if(dhash[0] == prefix) {
			console.log(i, 'attempts');
			return attempt;
		}
	}
	return null;
};
var join = function(arr) {
	var pos = 0; var len = arr.length;
	for(var i = 0; i < len; i++) {
		pos += arr[i].length;
	}
	var out = new Uint8Array(pos);
	var pos = 0;
	for(var i = 0; i < len; i++) {
		out.set(arr[i], pos);
		pos += arr[i].length;
	}
	return out;
};

///Convert to Hex string
var stringify = function(input, stopAt) {
	stopAt = stopAt || input.length;
	var str = [];
	for(var i = 0; i < stopAt; i++) {
		var ss = input[i].toString('16');
		if (ss.length < 2) ss = '0' + ss;
		str.push(ss);
	}
	return str.join('');
};

///Reverse of stringify
var decodeHexString = function(str) {
	var arr = [];
	for (var i = 0; i < str.length; i+=2) {
		arr.push(parseInt(str.substring(i, i+2), 16));
	}
	return new Uint8Array(arr);
	//return new Uint8Array(atob(b64encoded).split("").map(function(c) { return c.charCodeAt(0); }));
}
var hash = function(input) {
	return nacl.hash(nacl.hash(input));
};
var endpoint = function(pair, orArr) {
	var input = hash(orArr ? orArr : pair.publicKey);
	return stringify(input, 32);
};
var sign = function(input, key) {
	if(typeof(input) == 'string') input = new TextEncoder().encode(input);
	return nacl.sign.detached(input, key);
};


var HandshakeService = function() {
	this.nodes = {};
	this.session = {};
	
	//FIXME: we should fix this so it wont' change
	this.bob = createKeypair();
};

HandshakeService.prototype.node = function(nodeId, input, nonce, token) {
	console.log("input.length: ", input.length);
	if(input.length == 32) {
		var verifier =  stringify(hash(input), 32);
		console.log('verifier: ', verifier);
		
		if (verifier!=nodeId) return false;
		//console.log('here', nodeId, hash(input));	
	}
	else if(input.length == 104) {
		nonce = input.subarray(32, 32+24);
		token = input.subarray(56, 104);
		input = input.subarray(0,32);
		
		var verifier =  stringify(hash(input), 32);
		if (verifier!=nodeId) return false;
		
		//Unbox the token to get the session public key
		console.log('unbox session:...');
		var sessionKey = nacl.box.open(token, nonce, input, this.bob.secretKey);
		console.log('session pk: ', stringify(sessionKey));
		//remember the session public key
		this.session[nodeId] = sessionKey;
	}
	else {
		return false;
	}
	//if(hash(input) != nodeId) return false;
	if(!(nodeId in this.nodes)) {
		this.nodes[nodeId] = input;
	}
	
	/*
	var restId = hash(handshake);
	this.session[restId] = token;
	this.session[nodeId] = restId;
	*/
	return true;
}


function createKeypair() {
	return pair(0xfc);
}

function registerNode(publicKey) {
	nodeId = endpoint(publicKey);
	// expect( return bob.publicKey );
}

function createHandshake(alice, bob) {
	var nonce = nacl.randomBytes(24);
	var timestamp = new Uint8Array(new Float64Array([new Date().getTime()]).buffer);
	nonce.set(timestamp);
 
	// Box the session token.
	var session = nacl.sign.keyPair.fromSeed(alice.secretKey);
	console.log('session public key: ', stringify(session.publicKey));
	var token = nacl.box(session.publicKey, nonce, bob.publicKey, alice.secretKey);
	var handshake = join([alice.publicKey, nonce, token]);
	return handshake;

	// expect( return hash(handshake) )
}

function createSignal(path, restId, session) {
	var signal = stringify(join([restId, sign(path, session.secretKey)]));
	return signal;
}

module.exports = {
	createKeypair: createKeypair,
	pair: pair,
	endpoint: endpoint,
	createHandshake: createHandshake,
	hash: hash,
	stringify: stringify,
	decodeHexString: decodeHexString,
	HandshakeService: HandshakeService,
}
