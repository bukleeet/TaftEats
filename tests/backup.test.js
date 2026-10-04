const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, BSON } = require('mongoose').mongo;
const {
  createBackup,
  inspectBackup,
  restoreBackup,
  encryptSnapshot,
} = require('../database/backup');
let server, client, directory, file;
const passphrase = 'isolated backup recovery test passphrase';
before(async () => {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = new MongoClient(server.getUri());
  await client.connect();
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tafteats-backup-'));
  file = path.join(directory, 'fixture.backup.json');
  const source = client.db('backup_source');
  await source.collection('users').insertOne({
    _id: new BSON.ObjectId(),
    email: 'private-fixture@example.test',
    password: 'private-fixture-hash',
    createdAt: new Date('2026-01-01'),
    bytes: new BSON.Binary(Buffer.from([1, 2, 3])),
  });
  await source.collection('users').createIndex({ email: 1 }, { unique: true });
  await source.collection('reviews').insertOne({
    _id: new BSON.ObjectId(),
    body: '<p>Fixture</p>',
    value: BSON.Decimal128.fromString('4.5'),
    counter: BSON.Long.fromString('9007199254740993'),
  });
  await source
    .collection('sessions')
    .insertOne({ _id: 'do-not-restore', session: 'private-session' });
  await source.collection('ratelimitbuckets').insertOne({ _id: 'do-not-restore', totalHits: 1 });
});
after(async () => {
  await client?.close();
  await server?.stop();
  if (directory && path.resolve(directory).startsWith(path.join(os.tmpdir(), 'tafteats-backup-')))
    await fs.rm(directory, { recursive: true, force: true });
});
test('encrypted backup restores BSON documents and unique indexes without sessions or rate limits', async () => {
  const result = await createBackup({ uri: server.getUri('backup_source'), file, passphrase });
  assert.equal(result.collections.length, 2);
  const encoded = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(encoded, /private-fixture|private-session|mongodb:/);
  assert.deepEqual(await inspectBackup({ file, passphrase }), result);
  await restoreBackup({ uri: server.getUri('tafteats_restore_roundtrip'), file, passphrase });
  const restored = client.db('tafteats_restore_roundtrip');
  for (const name of ['users', 'reviews']) {
    assert.deepEqual(
      await restored.collection(name).find().toArray(),
      await client.db('backup_source').collection(name).find().toArray(),
    );
  }
  assert.equal(
    (await restored.collection('users').listIndexes().toArray()).find(
      (index) => index.name === 'email_1',
    ).unique,
    true,
  );
  assert.equal((await restored.listCollections().toArray()).length, 2);
  await assert.rejects(
    createBackup({ uri: server.getUri('backup_source'), file, passphrase }),
    /EEXIST/,
  );
});
test('wrong passphrases and tampered ciphertext fail before creating destination collections', async () => {
  await assert.rejects(
    restoreBackup({
      uri: server.getUri('tafteats_restore_wrong'),
      file,
      passphrase: 'incorrect isolated backup passphrase',
    }),
  );
  const envelope = JSON.parse(await fs.readFile(file, 'utf8'));
  envelope.data = (envelope.data[0] === 'A' ? 'B' : 'A') + envelope.data.slice(1);
  const tampered = path.join(directory, 'tampered.backup.json');
  await fs.writeFile(tampered, JSON.stringify(envelope));
  await assert.rejects(
    restoreBackup({ uri: server.getUri('tafteats_restore_tampered'), file: tampered, passphrase }),
  );
  assert.equal((await client.db('tafteats_restore_wrong').listCollections().toArray()).length, 0);
  assert.equal(
    (await client.db('tafteats_restore_tampered').listCollections().toArray()).length,
    0,
  );
});
test('restore refuses application databases and occupied recovery destinations without changing documents', async () => {
  await assert.rejects(
    restoreBackup({ uri: server.getUri('backup_source'), file, passphrase }),
    /separate tafteats_restore_/,
  );
  await assert.rejects(
    restoreBackup({ uri: server.getUri('tafteats_restore_roundtrip'), file, passphrase }),
    /must be empty/,
  );
  assert.equal(await client.db('backup_source').collection('users').countDocuments(), 1);
  assert.equal(
    await client.db('tafteats_restore_roundtrip').collection('users').countDocuments(),
    1,
  );
});
test('a failed collection insert rolls back earlier restored documents', async () => {
  const broken = path.join(directory, 'broken.backup.json');
  await fs.writeFile(
    broken,
    await encryptSnapshot(
      {
        version: 1,
        database: 'backup_source',
        createdAt: new Date(),
        collections: [
          { name: 'users', indexes: [], documents: [{ _id: 1, username: 'fixture' }] },
          { name: 'reviews', indexes: [], documents: [{ _id: 1 }, { _id: 1 }] },
        ],
      },
      passphrase,
    ),
  );
  await assert.rejects(
    restoreBackup({ uri: server.getUri('tafteats_restore_rollback'), file: broken, passphrase }),
  );
  const destination = client.db('tafteats_restore_rollback');
  assert.equal(await destination.collection('users').countDocuments(), 0);
  assert.equal(await destination.collection('reviews').countDocuments(), 0);
});

test('backup CLI rejects inherited action names, traversal, and unexpected arguments safely', () => {
  for (const args of [
    ['constructor', 'fixture.backup.json'],
    ['create', '../outside.backup.json'],
    ['inspect', 'fixture.backup.json', 'extra'],
  ]) {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, '../database/backup.js'), ...args],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Usage:/);
  }
});
