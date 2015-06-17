var Handshake = require('../src/handshake');
var assert = require('assert');
var Fio = require('../src/api');

var HandshakeService = Handshake.HandshakeService;

///Test the simple end-point sregistration
var testSimple = function() {
    var key = Handshake.createKeypair();
    //console.log('keypair: ', key);
    console.log('public key length: ', key.publicKey.length);
    var endpoint = Handshake.endpoint(key);
    console.log('endpoint: ', endpoint);
    var service = new HandshakeService();
    var res = service.node(endpoint, key.publicKey);
    assert(res);
}

//Test extended handshake
var testExtended = function() {
    var alice = Handshake.createKeypair(); //keypair of client
    var service = new HandshakeService();
    
    var bob = service.bob;
    
    //var bob = Handshake.createKeypair(); //simulate keypair of server
    var handshake = Handshake.createHandshake(alice, bob);
    console.log('handshake length: ', handshake.length);
    var endpoint = Handshake.endpoint(alice);
    
    var res = service.node(endpoint, handshake);
    assert(res);
}

var testCreateNode = function() {
    var fio  = new Fio('http://localhost:8090', false, 0);
    fio.createNode();
}

var testHandshake = function() {
    //var bob = Handshake.createKeypair(); //to fake server's public key!
    var bob = {'publicKey': Handshake.decodeHexString('2af37d7af58b07a65ee6fca7cc1432fa15d0e9c06bce81cd86f4fecee1114b55')};
    var fio  = new Fio('http://localhost:8090', false, 0);
    fio.handshake(bob.publicKey, function () {
        //callback if handshake successful!
        //Now, sign and post something to server!
        fio.postSigned('create');
    });
    
    //test another
    
}


//testCreateNode();

testHandshake();

//testSimple();
//testExtended();
