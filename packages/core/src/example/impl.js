// Not yet used, not used here.
// import backoff from 'backoff';
// stream can be moved out. postal interface is mostly limited in this use.

/*
 * Polyfill for promises: let's just implement a subset.
 */
import Promise from 'promise';

/*
 * Messaging library: security and verification.
 * Special thanks to TweetNaCl public domain contributors.
 */
import nf from 'tweetnacl';
import Nacl from './util/stream-nacl.js';
import outbound from 'request';
import postal from 'postal';
import route from './route';

const handshakePub = nf.util.encodeBase64(nf.box.keyPair().publicKey);

route.channel = function(uri) { const channel = postal.channel(namespace); return channel; };
route.post = function(uri, opts) { return outbound.post(uri, { headers: headers }); };
route.Promise = Promise;

// NOTES: This is currently just a singleton transfom, we are not managing multiple states.
route.transform = Nacl;
route.metaTransform = handshakePub;
/*
 *
 * Fio().watch returns a Promise for a postaljs channel and provides a post method which pipes to request.post, optionally using a transform.
 *
 */
