const { MongoClient, BSON } = require('mongoose').mongo;
const { randomBytes, scrypt, createCipheriv, createDecipheriv } = require('node:crypto');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const derive = promisify(scrypt);
const excluded = new Set(['sessions', 'ratelimitbuckets', 'rate_limits']);
const maxBytes = 64 * 1024 * 1024;

async function encryptionKey(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 20)
    throw new Error('Use a backup passphrase of at least 20 characters.');
  return derive(passphrase, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 });
}

async function encryptSnapshot(snapshot, passphrase) {
  const plaintext = Buffer.from(BSON.EJSON.stringify(snapshot, { relaxed: false }));
  if (plaintext.length > maxBytes) throw new Error('Snapshot exceeds the supported backup size.');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await encryptionKey(passphrase, salt);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return JSON.stringify({
      version: 1,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      data: data.toString('base64'),
    });
  } finally {
    key.fill(0);
    plaintext.fill(0);
  }
}

async function readSnapshot(file, passphrase) {
  if ((await fs.stat(file)).size > maxBytes * 2) throw new Error('Backup file is too large.');
  const envelope = JSON.parse(await fs.readFile(file, 'utf8'));
  if (
    envelope.version !== 1 ||
    !/^[a-f0-9]{32}$/.test(envelope.salt) ||
    !/^[a-f0-9]{24}$/.test(envelope.iv) ||
    !/^[a-f0-9]{32}$/.test(envelope.tag) ||
    typeof envelope.data !== 'string' ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(envelope.data)
  )
    throw new Error('Invalid backup envelope.');
  const key = await encryptionKey(passphrase, Buffer.from(envelope.salt, 'hex'));
  let plaintext;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
    plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'base64')),
      decipher.final(),
    ]);
    if (plaintext.length > maxBytes) throw new Error('Snapshot exceeds the supported backup size.');
    const snapshot = BSON.EJSON.parse(plaintext.toString(), { relaxed: false });
    const names = new Set();
    if (
      snapshot.version?.valueOf() !== 1 ||
      typeof snapshot.database !== 'string' ||
      !Array.isArray(snapshot.collections)
    )
      throw new Error('Invalid snapshot.');
    for (const entry of snapshot.collections) {
      if (
        typeof entry.name !== 'string' ||
        !/^[a-zA-Z0-9_-]+$/.test(entry.name) ||
        excluded.has(entry.name) ||
        names.has(entry.name) ||
        !Array.isArray(entry.documents) ||
        !Array.isArray(entry.indexes) ||
        entry.documents.some(
          (document) =>
            !document || typeof document !== 'object' || !Object.hasOwn(document, '_id'),
        )
      )
        throw new Error('Invalid snapshot collection.');
      names.add(entry.name);
    }
    return snapshot;
  } finally {
    key.fill(0);
    plaintext?.fill(0);
  }
}

function summary(snapshot) {
  return {
    database: snapshot.database,
    createdAt: snapshot.createdAt,
    collections: snapshot.collections.map((entry) => ({
      name: entry.name,
      count: entry.documents.length,
    })),
  };
}

async function createBackup({ uri, file, passphrase }) {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    appName: 'tafteats-backup',
  });
  try {
    await client.connect();
    const db = client.db();
    const snapshot = {
      version: 1,
      database: db.databaseName,
      createdAt: new Date(),
      collections: [],
    };
    for (const entry of await db.listCollections().toArray()) {
      if (excluded.has(entry.name)) continue;
      if (
        entry.type !== 'collection' ||
        !/^[a-zA-Z0-9_-]+$/.test(entry.name) ||
        Object.keys(entry.options || {}).length
      )
        throw new Error('Unsupported collection configuration; use MongoDB Database Tools.');
      snapshot.collections.push({
        name: entry.name,
        documents: [],
        indexes: await db.collection(entry.name).listIndexes().toArray(),
      });
    }
    const session = client.startSession();
    try {
      await session.withTransaction(
        async () => {
          for (const entry of snapshot.collections)
            entry.documents = await db
              .collection(entry.name)
              .find({}, { session })
              .sort({ _id: 1 })
              .toArray();
        },
        { readConcern: { level: 'snapshot' } },
      );
    } finally {
      await session.endSession();
    }
    const encrypted = await encryptSnapshot(snapshot, passphrase);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, encrypted, { flag: 'wx', mode: 0o600 });
    const verified = await readSnapshot(file, passphrase);
    if (
      BSON.EJSON.stringify(verified, { relaxed: false }) !==
      BSON.EJSON.stringify(snapshot, { relaxed: false })
    )
      throw new Error('Backup verification failed.');
    return summary(verified);
  } finally {
    await client.close();
  }
}

async function inspectBackup({ file, passphrase }) {
  return summary(await readSnapshot(file, passphrase));
}

async function restoreBackup({ uri, file, passphrase }) {
  const snapshot = await readSnapshot(file, passphrase);
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    appName: 'tafteats-restore',
  });
  try {
    await client.connect();
    const db = client.db();
    if (
      !/^tafteats_restore_[a-zA-Z0-9_]+$/.test(db.databaseName) ||
      db.databaseName === snapshot.database
    )
      throw new Error('Restore requires a separate tafteats_restore_ database.');
    if ((await db.listCollections().toArray()).length)
      throw new Error('Restore destination must be empty.');
    for (const entry of snapshot.collections) {
      await db.createCollection(entry.name);
      for (const index of entry.indexes) {
        if (index.name === '_id_') continue;
        const { key, ...options } = index;
        delete options.v;
        delete options.ns;
        await db.collection(entry.name).createIndex(key, options);
      }
    }
    const session = client.startSession();
    try {
      await session.withTransaction(
        async () => {
          for (const entry of snapshot.collections) {
            const collection = db.collection(entry.name);
            if (entry.documents.length) await collection.insertMany(entry.documents, { session });
            const restored = await collection.find({}, { session }).sort({ _id: 1 }).toArray();
            if (
              BSON.EJSON.stringify(restored, { relaxed: false }) !==
              BSON.EJSON.stringify(entry.documents, { relaxed: false })
            )
              throw new Error('Restored documents do not match the backup.');
          }
        },
        { writeConcern: { w: 'majority' } },
      );
    } finally {
      await session.endSession();
    }
    return { ...summary(snapshot), destination: db.databaseName, restored: true };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const [action, name, ...extra] = process.argv.slice(2);
  const filename = name || `tafteats-${new Date().toISOString().replace(/[:.]/g, '-')}.backup.json`;
  const actions = { create: createBackup, inspect: inspectBackup, restore: restoreBackup };
  const run = Object.hasOwn(actions, action) ? actions[action] : null;
  if (
    !run ||
    extra.length ||
    !/^[a-zA-Z0-9_-]+\.backup\.json$/.test(filename) ||
    (action !== 'create' && !name)
  ) {
    console.error('Usage: npm run backup -- create|inspect|restore [filename.backup.json]');
    process.exitCode = 1;
  } else {
    run({
      uri: action === 'restore' ? process.env.RESTORE_MONGO_URI : process.env.MONGO_URI,
      file: path.join(__dirname, '..', '.cache', 'backups', filename),
      passphrase: process.env.BACKUP_PASSPHRASE,
    })
      .then((result) => console.log(JSON.stringify(result)))
      .catch(() => {
        console.error(
          'Backup operation failed. Check the passphrase, file, replica set, and destination; private details omitted.',
        );
        process.exitCode = 1;
      });
  }
}
module.exports = { createBackup, inspectBackup, restoreBackup, encryptSnapshot };
