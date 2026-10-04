if (require.main === module) require('dotenv').config({ quiet: true });
const { MongoClient } = require('mongoose').mongo;
const fs = require('node:fs/promises');
const path = require('node:path');
const { assetFromUrl } = require('../src/services/media');

const ownedId = /^tafteats\/[a-zA-Z0-9_-]+$/;
const key = (asset) => asset.resourceType + ':' + asset.publicId;

async function auditMedia({ db, listResources, cloudName, now = new Date() }) {
  if (!cloudName || !Number.isFinite(now.getTime()))
    throw new Error('Invalid audit configuration.');
  const references = new Map();
  let documents = 0;
  for (const [collection, field] of [
    ['users', 'avatar'],
    ['reviews', 'media'],
    ['establishments', 'image'],
  ]) {
    const cursor = db
      .collection(collection)
      .find({}, { projection: { _id: 0, [field]: 1 }, maxTimeMS: 10000 });
    try {
      for await (const document of cursor) {
        if (++documents > 10000) throw new Error('Database exceeds the audit size limit.');
        const values = Array.isArray(document[field]) ? document[field] : [document[field]];
        for (const value of values) {
          if (typeof value !== 'string') continue;
          const asset = assetFromUrl(value, cloudName);
          if (asset && ownedId.test(asset.publicId)) references.set(key(asset), asset);
        }
      }
    } finally {
      await cursor.close();
    }
  }

  const seen = new Set();
  const unreferenced = [];
  let recent = 0;
  let excluded = 0;
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  for (const resourceType of ['image', 'video']) {
    let nextCursor;
    const cursors = new Set();
    let pages = 0;
    do {
      if (++pages > 20) throw new Error('Provider inventory exceeds the audit size limit.');
      const page = await listResources({
        type: 'upload',
        resource_type: resourceType,
        prefix: 'tafteats/',
        max_results: 500,
        timeout: 30000,
        fields: 'public_id,resource_type,type,created_at',
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      });
      if (!Array.isArray(page?.resources) || page.resources.length > 500)
        throw new Error('Invalid provider inventory.');
      for (const resource of page.resources) {
        // Nested folders include the independently preserved original app.
        if (!ownedId.test(resource.public_id) || resource.type !== 'upload') {
          excluded += 1;
          continue;
        }
        if (resource.resource_type !== resourceType)
          throw new Error('Unexpected provider resource type.');
        const created = Date.parse(resource.created_at);
        if (!Number.isFinite(created)) throw new Error('Invalid provider asset date.');
        const asset = { publicId: resource.public_id, resourceType };
        const assetKey = key(asset);
        if (seen.has(assetKey)) throw new Error('Duplicate provider inventory entry.');
        seen.add(assetKey);
        if (references.has(assetKey)) continue;
        if (created > cutoff) recent += 1;
        else unreferenced.push({ ...asset, createdAt: new Date(created).toISOString() });
      }
      nextCursor = page.next_cursor;
      if (nextCursor !== undefined && (typeof nextCursor !== 'string' || !nextCursor.length))
        throw new Error('Invalid provider cursor.');
      if (nextCursor && cursors.has(nextCursor)) throw new Error('Repeated provider cursor.');
      if (nextCursor) cursors.add(nextCursor);
    } while (nextCursor);
  }
  const missing = [...references]
    .filter(([assetKey]) => !seen.has(assetKey))
    .map(([, asset]) => asset);
  const sort = (a, b) => key(a).localeCompare(key(b));
  return {
    createdAt: now.toISOString(),
    readOnly: true,
    graceHours: 24,
    scanned: seen.size,
    referenced: references.size,
    recent,
    excluded,
    unreferenced: unreferenced.sort(sort),
    missing: missing.sort(sort),
  };
}

async function run() {
  if (process.argv.length !== 2) throw new Error('Usage: npm run media:audit');
  if (
    !process.env.MONGO_URI ||
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  )
    throw new Error('Media audit requires MongoDB and Cloudinary configuration.');
  const client = new MongoClient(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    appName: 'tafteats-media-audit',
  });
  try {
    await client.connect();
    const cloudinary = require('../src/config/cloudinary');
    const report = await auditMedia({
      db: client.db(),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      listResources: (options) => cloudinary.api.resources(options),
    });
    const directory = path.join(__dirname, '..', '.cache', 'media-audits');
    await fs.mkdir(directory, { recursive: true });
    const filename = 'media-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    await fs.writeFile(path.join(directory, filename), JSON.stringify(report, null, 2) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(
      JSON.stringify({
        event: 'media_audit_complete',
        report: '.cache/media-audits/' + filename,
        scanned: report.scanned,
        referenced: report.referenced,
        unreferenced: report.unreferenced.length,
        missing: report.missing.length,
        recent: report.recent,
        excluded: report.excluded,
        readOnly: true,
      }),
    );
  } finally {
    await client.close();
  }
}
if (require.main === module)
  run().catch(() => {
    console.error(
      'Media audit failed; no assets were changed. Check configuration and provider availability. Private details omitted.',
    );
    process.exitCode = 1;
  });
module.exports = { auditMedia };
