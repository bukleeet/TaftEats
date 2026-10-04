const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { createRuntime } = require('../src/server');
const { createApp } = require('../src/app');
let db, runtime;
const sessionSecret = 'runtime-test-secret-at-least-32-characters';
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  runtime = createRuntime({ mongoUri: db.getUri('runtime_test'), sessionSecret });
});
after(async () => {
  mock.restoreAll();
  await runtime.close();
  await db.stop();
});
test('runtime shares initialization and handles requests with a real persistent session store', async () => {
  const [a, b] = await Promise.all([runtime.initialize(), runtime.initialize()]);
  assert.equal(a, b);
  const page = await request(runtime.handler).get('/login').expect(200);
  assert.match(page.headers['set-cookie'][0], /tafteats.sid=/);
  const collection = mongoose.connection.collection('sessions');
  assert.equal(await collection.countDocuments(), 1);
  await request(runtime.handler).get('/health').expect(200);
});
test('failed serverless initialization returns a generic 503 and allows retry', async () => {
  const failed = createRuntime({ mongoUri: 'mongodb://invalid.example.test/app', sessionSecret });
  const attempt = mock.method(mongoose, 'connect', async () => {
    throw new Error('private connection details');
  });
  for (let i = 0; i < 2; i++) {
    const res = await request(failed.handler).get('/login').expect(503);
    assert.doesNotMatch(res.text, /private connection|invalid.example/);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['retry-after'], '5');
  }
  assert.equal(attempt.mock.callCount(), 2);
  attempt.mock.restore();
});
test('production cookies require HTTPS through an explicitly trusted proxy', async () => {
  const app = createApp({
    sessionSecret,
    production: true,
    trustProxy: 1,
    sessionStore: new session.MemoryStore(),
    persistentRateLimits: false,
  });
  const page = await request(app).get('/login').set('X-Forwarded-Proto', 'https').expect(200);
  assert.match(page.headers['set-cookie'][0], /; Secure/);
  assert.ok(page.headers['strict-transport-security']);
  const plain = await request(app).get('/login').expect(200);
  assert.equal(plain.headers['set-cookie'], undefined);
});
