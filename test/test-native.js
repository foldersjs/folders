import test from 'node:test';
import assert from 'node:assert';
import FoldersTest from './test-folders.js';
import FoldersLocal from '../src/folders-local.js';
import fs from 'fs';
import UnionFio from '../src/union.js';
import Fio from '../src/api.js';
import SyncUnionFio from '../src/folders-sync-union.js';
import * as Handshake from '../src/handshake.js';
import { start, stop } from './test-server.js';
import { describe, before, after } from 'node:test';

test('local folders test', async () => {
  const foldersTest = new FoldersTest(new FoldersLocal());
  await foldersTest.test('.');
});

test('union folders test', async () => {
	const fio = new Fio();

	const mounts = [ {
		"stub" : fio.provider("stub")
	}, {
		"local" : fio.provider("local")
	}, {
		"memory" : fio.provider("memory")
	}
	];

	const unionfs = await UnionFio.create(fio, mounts, {
		"view" : "list"
	});

	const foldersTest = new FoldersTest(unionfs);
	await foldersTest.test('/memory/');
});

test('sync union compareFile test', async () => {
  const mounts = {
    source : {
      module : 'stub',
      dir : '/'
    },
    destination : {
      module : 'memory',
      dir : '/'
    }
  };

  const syncOptions = {
    filter : '*.txt',
    ignoreCase : true,
    compareSize : true
  };

  const syncUnionFS = await SyncUnionFio.create(mounts, syncOptions);

  let folder1 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 436
  };
  let folder2 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 437
  };
  let option = {
    ignoreCase : true,
    compareSize : true,
    ignoreDirPath : true
  };
  assert.strictEqual(syncUnionFS.compareFile('/', folder1, '/', folder2, option), false);

  folder1 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 436
  };
  folder2 = {
    name : '1.txt',
    fullPath : '/1.txt',
    size : 437
  };
  option = {
    ignoreCase : true,
    compareSize : false,
    ignoreDirPath : true
  };
  assert.strictEqual(syncUnionFS.compareFile('/', folder1, '/', folder2, option), true);
});

test('sync union ls and sync test', async () => {
  const mounts = {
    source : {
      module : 'stub',
      dir : '/'
    },
    destination : {
      module : 'memory',
      dir : '/'
    }
  };

  const syncOptions = {
    filter : '*.txt',
    ignoreCase : true,
    compareSize : true
  };

  const syncUnionFS = await SyncUnionFio.create(mounts, syncOptions);

  const ls = (instance) => {
    return new Promise((resolve, reject) => {
      instance.ls((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  const sync = (instance) => {
    return new Promise((resolve, reject) => {
      instance.sync((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  const result = await ls(syncUnionFS);
  assert.ok(result);

  const syncResult = await sync(syncUnionFS);
  assert.ok(syncResult);
});

describe('handshake tests', () => {
    before(async () => {
        await start();
    });

    after(async () => {
        await stop();
    });

    test('handshake simple test', () => {
        const HandshakeService = Handshake.HandshakeService;
        const key = Handshake.createKeypair();
        const endpoint = Handshake.endpoint(key);
        const service = new HandshakeService();
        const sessionKey = new Uint8Array(64);
        const handshake = Handshake.join([Handshake.decodeHexString(endpoint), sessionKey]);
        const res = service.node(endpoint, handshake);
        assert(res);
    });

    test('handshake extended test', () => {
        const HandshakeService = Handshake.HandshakeService;
        const alice = Handshake.createKeypair();
        const service = new HandshakeService();
        const bob = service.bob;
        const handshake = Handshake.createHandshake(alice, bob);
        const endpoint = Handshake.endpoint(alice);
        const res = service.node(endpoint, Handshake.decodeHexString(handshake.handshake));
        assert(res);
    });

test('createNode returns correct options', () => {
    const fio  = new Fio('http://localhost:8090', false, 0);
    const key = Handshake.createKeypair();
    const options = fio.createNode(key);
    assert.strictEqual(options.port, 8090);
    assert.strictEqual(options.method, 'PUT');
    assert.ok(options.uri.startsWith('http://localhost:8090/fc'));
    assert.strictEqual(options.body, Handshake.stringify(key.publicKey));
});

test.skip('S3 to HDFS sync test', () => {
  // This test is skipped because it requires credentials for AWS S3 and HDFS.
});

test('handshake test', (t, done) => {
    const mockRoute = {
        request: (options) => {
            const stream = {
                on: (event, cb) => {
                    if (event === 'response') {
                        cb();
                    }
                    return stream;
                },
                pipe: () => {}
            };
            return stream;
        }
    };

    const bob = {'publicKey': Handshake.decodeHexString('2af37d7af58b07a65ee6fca7cc1432fa15d0e9c06bce81cd86f4fecee1114b55')};
    const fio  = new Fio('http://localhost:8090', false, mockRoute);
    fio.handshake(bob.publicKey, () => {
        // This is where postSigned would be called.
        // For this test, we just need to make sure the callback is called.
        done();
    });
});
});
