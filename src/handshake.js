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

/* Join an array of string/buffer into a Uint8Array buffer */
var join = function(arr) {
	var pos = 0; var len = arr.length;
	for(var i = 0; i < len; i++) {
		pos += arr[i].length;
	}
	var out = new Uint8Array(pos);
	var pos = 0;
	for(var i = 0; i < len; i++) {
		var tmp = arr[i];
		if (typeof(arr[i]) == 'string'){
			tmp = toArray(arr[i]);
		}
		out.set(tmp, pos);
		pos += arr[i].length;
	}
	return out;
};

///Convert a string to Uint8Array buffer
var toArray = function( str) {
	var out = new Uint8Array(str.length);
	for (var i = 0; i < str.length; i++) {
		out[i]=str.charCodeAt(i);
	}
	return out;
}

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

///Decode a hex string into an Uint8Array
//This function is the reverse of stringify function
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
	//if(typeof(input) == 'string') input = new TextEncoder().encode(input);
	if (typeof(input) == 'string') input = join([input]);
	console.log('sign', input, key);
	return nacl.sign.detached(input, key);
};


var HandshakeService = function() {
	this.nodes = {};
	this.session = {};
	
	//This is the Service's key-pair
	//FIXME: this should be generated, not hardcoded!
	this.bob = {'publicKey': decodeHexString('2af37d7af58b07a65ee6fca7cc1432fa15d0e9c06bce81cd86f4fecee1114b55'),
				'secretKey': decodeHexString('5cc4597497c702d665959146689ad832a0b43c79336751c1473e88df104707d4')};
	
	
	
	console.log('secretKey length: ',  this.bob.secretKey.length);
	
	//some quick testing for session key
	
	//var session = nacl.sign.keyPair();
	//console.log('session private key: ', stringify(session.secretKey));
	//console.log('session public key: ', stringify(session.publicKey));
	
	var session = {"secretKey":decodeHexString("9946846a6a0c594e915a550775f6fd751592f97f0fa0d220935d4efa8c517ed8b8e61f3cc895dfa786d9c57f6bfc064a5b0fbd657bb00b94e2240213ca09a2da"),
					"publicKey":decodeHexString("b8e61f3cc895dfa786d9c57f6bfc064a5b0fbd657bb00b94e2240213ca09a2da")};
	
	//console.log('box secret key: ', nacl.box.keyPair().secretKey.length);
	//console.log('sign secret key: ', nacl.sign.keyPair().secretKey.length);
	var message = toArray('/dir/testshareid');
	var signature = nacl.sign.detached(message, session.secretKey);
	console.log('test signature: ', stringify(signature));
	
	//test if we can decrypt it!
	var res = nacl.sign.detached.verify(message, signature, session.publicKey);
	console.log('verify: ', res);
	
	
	this.session[''] = [session.publicKey];
	
	
	//this.userPublicKey = 'test';
	/*
	//Generate initial keypair for the service
	this.bob = createKeypair();
	//serialize this!
	console.log('bob public key: ', stringify(this.bob.publicKey));
	console.log('bob secret key: ', stringify(this.bob.secretKey));
	*/
};

HandshakeService.prototype.setUserPublicKey = function(key) {
	this.userPublicKey = key;
}

HandshakeService.prototype.node = function(nodeId, input) {
	console.log("nodeId & input.length: ", nodeId, input.length);
	if(input.length == 32) {
		var verifier =  stringify(hash(input), 32);
		console.log('verifier: ', verifier);
		
		if (verifier!=nodeId) return false;
		//console.log('here', nodeId, hash(input));	
	}
	else if(input.length == 104) {
		console.log('extended handshake');
		nonce = input.subarray(32, 32+24);
		token = input.subarray(56, 104);
		input = input.subarray(0,32);
		
		//console.log("Server --Alice-- Public key:");
		//console.log(input);
		
		/*
		var verifier =  stringify(hash(input), 32);
		if (verifier!=nodeId) {
			console.log('verified FAILED');
			return false;
		}else{
			console.log('verified PASSED');
		}
		*/
		
		//Unbox the token to get the session public key
		console.log('unbox session:...');
		var sessionKey = nacl.box.open(token, nonce, input, this.bob.secretKey);
		if (!sessionKey) {
			console.log('invalid service key');
			return false;
		}
		console.log('session public Key length: ', sessionKey.length);
		
		//unbox successfully!
		
		//console.log('session pk: ', sessionKey, stringify(sessionKey));
		
		//remember the session public key
		//We can have multiple session under a shareId
		if (typeof(this.session[nodeId]) == 'undefined')
			this.session[nodeId] = [];
		//this.session[nodeId][sessionKey] = true;
		this.session[nodeId].push(sessionKey);
		console.log('session count: ', this.session[nodeId].length);
	}
	else {
		console.log('unknown token!');
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

/* Verify if a request belongs to a valid session */
HandshakeService.prototype.verifyRequest = function(nodeId, path, signature) {
	console.log('verifyRequest: ', nodeId, path, signature);
	if (typeof(this.session[nodeId]) == 'undefined') {
		console.log('Error! Node session not found!');
		return false;
	}
	else {
		console.log("existing session found: ", this.session[nodeId].length);
	}
	//console.log('session count: ', this.session[nodeId].length);
	//convert to Uint8 array
	var arrPath = join([path]);
	var arrSign = decodeHexString(signature);
	//for (k in this.session[nodeId]) {
	for (var i = 0; i < this.session[nodeId].length; i++) {
		var k = this.session[nodeId][i];
		//var sessionKey = this.session[nodeId][k];
		console.log("session: ", stringify(k));
		
		var res = nacl.sign.detached.verify(arrPath, arrSign, k);
		//var res = false;
		if (res) {
			console.log('request OK');
			return true; //find the session that match!
		}
		//FIXME: verify if res is same as path!
	}
	return false;
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
	//console.log('session public key: ', stringify(session.publicKey));
	//console.log('session secret key: ', session.secretKey);
	var token = nacl.box(session.publicKey, nonce, bob.publicKey, alice.secretKey);
	var handshake = join([alice.publicKey, nonce, token]);
	return {'session': session, 'handshake': stringify(handshake)};
	// expect( return hash(handshake) )
}

function createSignal(path, restId, session) {
	var signal = stringify(join([restId, sign(path, session.secretKey)]));
	return signal;
}

/*
function encryptMessage(msg, session, bob) {
	return nacl.box([msg, '', bob.publicKey, session.secretKey]);
}
*/

///Sign the request using the generate session key

function signRequest(path, session) {
	//console.log('signRequest', session.secretKey);
	return stringify(sign(path, session.secretKey));
}



module.exports = {
	join: join,
	createKeypair: createKeypair,
	pair: pair,
	endpoint: endpoint,
	createHandshake: createHandshake,
	hash: hash,
	stringify: stringify,
	signRequest: signRequest,
	//encryptMessage: encryptMessage,
	decodeHexString: decodeHexString,
	HandshakeService: HandshakeService,
}
