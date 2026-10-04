const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Writable } = require('node:stream');
const cloudinary = require('../src/config/cloudinary');
const media = require('../src/services/media');
const { upload } = require('../src/middleware/upload');

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=',
  'base64',
);
const files = () => [{ mimetype: 'image/png', buffer: png }];

test(
  'disconnected requests cannot exceed background upload capacity, and failure releases it',
  { timeout: 10000 },
  async (t) => {
    const oldKey = process.env.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_API_KEY = 'isolated-test-key';
    const responses = [new EventEmitter(), new EventEmitter(), new EventEmitter()];
    const work = [];
    const pending = [];
    let started;
    const twoStarted = new Promise((resolve) => {
      started = resolve;
    });
    let recoveredStarted;
    const recoveryStarted = new Promise((resolve) => {
      recoveredStarted = resolve;
    });
    let rejectUnexpected = true;
    t.mock.method(cloudinary.uploader, 'upload_stream', (_options, callback) => {
      pending.push(callback);
      if (pending.length === 2) started();
      if (pending.length === 3) recoveredStarted();
      if (pending.length > 2 && rejectUnexpected)
        queueMicrotask(() => callback(new Error('Unexpected third background upload')));
      return new Writable({
        write(_chunk, _encoding, done) {
          done();
        },
      });
    });
    t.after(async () => {
      for (const response of responses) response.emit('close');
      for (const callback of pending) callback(new Error('Test cleanup'));
      await Promise.allSettled(work);
      if (oldKey === undefined) delete process.env.CLOUDINARY_API_KEY;
      else process.env.CLOUDINARY_API_KEY = oldKey;
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await assert.rejects(
        media.uploadFiles([{ mimetype: 'image/png', buffer: Buffer.from('invalid') }]),
        { status: 400 },
      );
    }
    const guard = upload()[0];
    guard({}, responses[0], () => {});
    guard({}, responses[1], () => {});
    const first = media.uploadFiles(files());
    const second = media.uploadFiles(files());
    work.push(first, second);
    await twoStarted;
    responses[0].emit('close');
    responses[1].emit('close');
    // The HTTP buffer slots are free, but provider work is still running.
    guard({}, responses[2], () => {});
    await assert.rejects(media.uploadFiles(files()), { status: 503 });
    assert.equal(pending.length, 2);
    assert.deepEqual(await media.uploadFiles([]), []);

    const failed = assert.rejects(first, /Provider unavailable/);
    pending[0](new Error('Provider unavailable'));
    await failed;
    rejectUnexpected = false;
    const recovered = media.uploadFiles(files());
    work.push(recovered);
    // Validation is asynchronous; wait for the provider to observe the admitted call.
    await recoveryStarted;
    pending[1](null, {
      secure_url: 'https://res.cloudinary.com/test/image/upload/tafteats/second.webp',
    });
    pending[2](null, {
      secure_url: 'https://res.cloudinary.com/test/image/upload/tafteats/recovered.webp',
    });
    assert.deepEqual(await second, [
      'https://res.cloudinary.com/test/image/upload/tafteats/second.webp',
    ]);
    assert.deepEqual(await recovered, [
      'https://res.cloudinary.com/test/image/upload/tafteats/recovered.webp',
    ]);
  },
);
