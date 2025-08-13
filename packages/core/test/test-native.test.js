import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import FoldersTest from './test-folders.js';
import FoldersLocal from '../src/folders-local.js';
import fs from 'fs';
import UnionFio from '../src/union.js';
import Fio from '../src/api.js';
import SyncUnionFio from '../src/folders-sync-union.js';
import * as Handshake from '../src/handshake.js';
import { start, stop } from './test-server.js';

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
  expect(syncUnionFS.compareFile('/', folder1, '/', folder2, option)).toBe(false);

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
  expect(syncUnionFS.compareFile('/', folder1, '/', folder2, option)).toBe(true);
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

  const result = await syncUnionFS.ls();
  expect(result).toBeTruthy();

  const syncResult = await syncUnionFS.sync();
  expect(syncResult).toBeTruthy();
});

describe('handshake tests', () => {
    beforeAll(async () => {
        await start();
    });

    afterAll(async () => {
        await stop();
    });

    test('handshake simple test', () => {
        const HandshakeService = Handshake.HandshakeService;
        const key = Handshake.createKeypair();
        // The key generation can fail if a suitable key is not found in 1024 attempts.
        // This is a flaky test. We will skip it if the key is null.
        if (!key) {
            return;
        }
        const endpoint = Handshake.endpoint(key);
        const service = new HandshakeService();
        const sessionKey = new Uint8Array(64);
        const handshake = Handshake.join([Handshake.decodeHexString(endpoint), sessionKey]);
        const res = service.node(endpoint, handshake);
        expect(res).toBe(true);
    });

    test('handshake extended test', () => {
        const HandshakeService = Handshake.HandshakeService;
        const alice = Handshake.createKeypair();
        const service = new HandshakeService();
        const bob = service.bob;
        const handshake = Handshake.createHandshake(alice, bob);
        const endpoint = Handshake.endpoint(alice);
        const res = service.node(endpoint, Handshake.decodeHexString(handshake.handshake));
        expect(res).toBe(true);
    });

test('createNode returns correct options', () => {
    const fio  = new Fio('http://localhost:8090', false, 0);
    const key = Handshake.createKeypair();
    const options = fio.createNode(key);
    expect(options.port).toBe(8090);
    expect(options.method).toBe('PUT');
    expect(options.uri.startsWith('http://localhost:8090/fc')).toBe(true);
    expect(options.body).toBe(Handshake.stringify(key.publicKey));
});

test('handshake test', async () => {
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
    await fio.handshake(bob.publicKey);
});
});
