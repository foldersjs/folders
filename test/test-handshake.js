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

var testNode = function() {
    var fio  = new Fio('http://localhost:8090', false, 0);
    fio.createNode();
}

testNode();

//testSimple();
//testExtended();
