// An ephemeral, isolated preview. Never reads .env or connects to the real database.
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const { seedDemo } = require('../database/seed');
async function main() {
  const db = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [{ dbName: 'tafteats_demo' }],
  });
  process.env.DEMO_MONGO_URI = db.getUri('tafteats_demo');
  await seedDemo();
  const app = createApp({
    sessionSecret: 'local-preview-secret-unique-to-this-process',
    persistentRateLimits: false,
  });
  const server = app.listen(3001, '127.0.0.1', () =>
    console.log('Isolated preview: http://127.0.0.1:3001'),
  );
  const stop = () =>
    server.close(async () => {
      await mongoose.disconnect();
      await db.stop();
      process.exit(0);
    });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
main().catch(() => {
  console.error('Could not start the isolated preview.');
  process.exitCode = 1;
});
