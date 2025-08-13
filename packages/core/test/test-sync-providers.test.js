import { test, expect, vi } from 'vitest';
import SyncUnionFio from '../src/folders-sync-union.js';
import S3Mock from './mocks/folders-s3.js';
import HDFSMock from './mocks/folders-hdfs.js';
import stream from 'stream';

vi.mock('folders-s3', () => ({
    default: S3Mock
}));

vi.mock('folders-hdfs', () => ({
    default: HDFSMock
}));

test('S3 to HDFS sync test', async () => {
    const mounts = {
        source: {
            module: 's3',
            dir: '/',
            opts: {}
        },
        destination: {
            module: 'hdfs',
            dir: '/',
            opts: {}
        }
    };

    const syncOptions = {
        filter: '*.txt',
        ignoreCase: true,
        compareSize: true
    };

    const syncUnionFS = await SyncUnionFio.create(mounts, syncOptions);

    // Add a file to the S3 mock
    const s3Provider = syncUnionFS.source.provider;
    const hdfsProvider = syncUnionFS.destination.provider;

    const readable = new stream.Readable();
    readable.push('hello world');
    readable.push(null);

    await new Promise((resolve) => {
        s3Provider.write('test.txt', readable, resolve);
    });


    const result = await syncUnionFS.ls();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('test.txt');

    const syncResult = await syncUnionFS.sync();
    expect(syncResult.length).toBe(1);
    expect(syncResult[0]).toContain('s3:/test.txt ==> hdfs');

    const hdfsFiles = await new Promise((resolve) => {
        hdfsProvider.ls('/', (err, files) => {
            resolve(files);
        });
    });
    expect(hdfsFiles.length).toBe(1);
    expect(hdfsFiles[0].name).not.toBe(null);
});
