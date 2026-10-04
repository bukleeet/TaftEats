const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { createApp } = require('./app');

function createRuntime(config) {
  mongoose.set('bufferCommands', false);
  let initializing;
  let app;
  let store;
  async function initialize() {
    if (app && mongoose.connection.readyState === 1) return app;
    initializing ||= (async () => {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 });
      if (!store) {
        store = MongoStore.create({
          client: mongoose.connection.getClient(),
          ttl: 21 * 24 * 60 * 60,
          autoRemove: 'native',
        });
        store.on('error', () => console.error(JSON.stringify({ event: 'session_store_failed' })));
        app = createApp({ ...config, sessionStore: store });
      }
      return app;
    })().finally(() => {
      initializing = null;
    });
    return initializing;
  }
  async function handler(req, res) {
    try {
      (await initialize())(req, res);
    } catch {
      console.error(JSON.stringify({ event: 'database_unavailable' }));
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Retry-After', '5');
      res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable.' }));
    }
  }
  async function close() {
    if (store) await store.close();
    await mongoose.disconnect();
  }
  return { handler, initialize, close };
}
module.exports = { createRuntime };
