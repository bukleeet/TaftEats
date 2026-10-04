const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongoose').mongo;
const { auditMedia } = require('../database/media-audit');
let server, client, db;
const now = new Date('2026-10-04T12:00:00Z');
const url = (id, type = 'image', cloud = 'test-cloud') =>
  'https://res.cloudinary.com/' + cloud + '/' + type + '/upload/v123/tafteats/' + id + '.webp';
const asset = (id, type = 'image', created = '2026-10-01T12:00:00Z') => ({
  public_id: 'tafteats/' + id,
  resource_type: type,
  type: 'upload',
  created_at: created,
});
const run = (listResources) => auditMedia({ db, listResources, cloudName: 'test-cloud', now });
before(async () => {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = new MongoClient(server.getUri());
  await client.connect();
  db = client.db('isolated_media_audit');
  await db.collection('users').insertOne({ avatar: url('avatar'), password: 'private-hash' });
  await db.collection('reviews').insertOne({
    media: [
      url('used-video', 'video'),
      url('missing'),
      url('foreign', 'image', 'another-cloud'),
      url('original_20261004/preserved'),
    ],
    body: 'private-body',
  });
  await db.collection('establishments').insertOne({ image: url('restaurant') });
});
after(async () => {
  await client?.close();
  await server?.stop();
});

test('media audit paginates both types, preserves references, excludes shared folders and recent uploads', async () => {
  const calls = [];
  const before = await db.collection('reviews').findOne();
  const report = await run(async (options) => {
    calls.push(options);
    assert.equal(options.prefix, 'tafteats/');
    assert.equal(options.type, 'upload');
    assert.equal(options.max_results, 500);
    if (options.resource_type === 'video')
      return { resources: [asset('used-video', 'video'), asset('avatar', 'video')] };
    if (options.next_cursor === 'page-two')
      return {
        resources: [
          asset('restaurant'),
          asset('original_20261004/preserved'),
          asset('unrelated/outside'),
        ],
      };
    return {
      resources: [
        asset('avatar'),
        asset('orphan'),
        asset('recent', 'image', '2026-10-04T11:59:00Z'),
        asset('future', 'image', '2026-10-05T00:00:00Z'),
      ],
      next_cursor: 'page-two',
    };
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[1].next_cursor, 'page-two');
  assert.equal(report.readOnly, true);
  assert.equal(report.referenced, 4);
  assert.equal(report.scanned, 7);
  assert.equal(report.recent, 2);
  assert.equal(report.excluded, 2);
  assert.deepEqual(report.missing, [{ publicId: 'tafteats/missing', resourceType: 'image' }]);
  assert.deepEqual(
    report.unreferenced.map(({ publicId, resourceType }) => [publicId, resourceType]),
    [
      ['tafteats/orphan', 'image'],
      ['tafteats/avatar', 'video'],
    ],
  );
  assert.deepEqual(await db.collection('reviews').findOne(), before);
  assert.doesNotMatch(JSON.stringify(report), /private-hash|private-body|foreign|preserved/);
});

test('media audit refuses partial, repeated, or malformed provider inventories', async () => {
  await assert.rejects(
    run(async () => {
      throw new Error('Provider unavailable');
    }),
    /Provider unavailable/,
  );
  let pages = 0;
  await assert.rejects(
    run(async () => ({
      resources: [asset('page-' + ++pages)],
      next_cursor: 'repeated',
    })),
    /Repeated provider cursor/,
  );
  assert.equal(pages, 2);
  for (const response of [
    {},
    { resources: [asset('invalid-date', 'image', 'not-a-date')] },
    { resources: [asset('wrong-type', 'video')] },
    { resources: [asset('duplicate'), asset('duplicate')] },
    { resources: [], next_cursor: 42 },
  ])
    await assert.rejects(
      run(async () => response),
      /Invalid|Unexpected|Duplicate/,
    );
});

test('media audit stops before an unbounded provider inventory can consume resources', async () => {
  let calls = 0;
  await assert.rejects(
    run(async () => ({
      resources: [],
      next_cursor: 'page-' + ++calls,
    })),
    /audit size limit/,
  );
  assert.equal(calls, 20);
});

test('media audit refuses an oversized database before calling Cloudinary', async () => {
  const large = client.db('oversized_media_audit');
  await large
    .collection('users')
    .insertMany(Array.from({ length: 10001 }, () => ({ avatar: '/local.svg' })));
  let called = false;
  await assert.rejects(
    auditMedia({
      db: large,
      cloudName: 'test-cloud',
      now,
      listResources: async () => {
        called = true;
        return { resources: [] };
      },
    }),
    /audit size limit/,
  );
  assert.equal(called, false);
});

test('media audit CLI rejects extra arguments without exposing configuration', () => {
  const privateUri = new URL('mongodb://127.0.0.1:1/private-db');
  privateUri.username = 'private-user';
  privateUri.password = 'private-password';
  const result = spawnSync(process.execPath, ['database/media-audit.js', '--delete'], {
    cwd: require('node:path').join(__dirname, '..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      MONGO_URI: privateUri.href,
    },
    timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no assets were changed/);
  assert.doesNotMatch(result.stdout + result.stderr, /private-user|private-password|private-db/);
  assert.equal(result.stdout, '');
});
