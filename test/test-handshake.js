import * as Handshake from '../src/handshake.js';
import assert from 'assert';
import Fio from '../src/api.js';

const HandshakeService = Handshake.HandshakeService;

const testSimple = function() {
    const key = Handshake.createKeypair();
    console.log('public key length: ', key.publicKey.length);
    const endpoint = Handshake.endpoint(key);
    console.log('endpoint: ', endpoint);
    const service = new HandshakeService();
    const res = service.node(endpoint, key.publicKey);
    assert(res);
}

const testExtended = function() {
    const alice = Handshake.createKeypair();
    const service = new HandshakeService();
    
    const bob = service.bob;
    
    const handshake = Handshake.createHandshake(alice, bob);
    console.log('handshake length: ', handshake.length);
    const endpoint = Handshake.endpoint(alice);
    
    const res = service.node(endpoint, handshake);
    assert(res);
}

const testCreateNode = function() {
    const fio  = new Fio('http://localhost:8090', false, 0);
    fio.createNode();
}

const testHandshake = function() {
    const bob = {'publicKey': Handshake.decodeHexString('2af37d7af58b07a65ee6fca7cc1432fa15d0e9c06bce81cd86f4fecee1114b55')};
    const fio  = new Fio('http://localhost:8090', false, 0);
    fio.handshake(bob.publicKey, function () {
        fio.postSigned('create');
    });
}

testHandshake();
