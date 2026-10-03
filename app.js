require('dotenv').config({ quiet: true });
const { readConfig } = require('./src/config/env');
const { createRuntime } = require('./src/server');
let config, runtime;
try {
  config = readConfig();
  runtime = createRuntime(config);
  module.exports = runtime.handler;
} catch {
  console.error(JSON.stringify({ event: 'configuration_invalid' }));
  module.exports = (_req, res) => {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable.' }));
  };
  if (require.main === module) process.exitCode = 1;
}
if (require.main === module && runtime) {
  runtime
    .initialize()
    .then((app) => {
      const server = app.listen(config.port, () =>
        console.log(`TaftEats listening on http://localhost:${config.port}`),
      );
      server.requestTimeout = 30000;
      server.headersTimeout = 15000;
      let closing = false;
      const shutdown = () => {
        if (closing) return;
        closing = true;
        server.close(async () => {
          await runtime.close();
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
      };
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    })
    .catch(async () => {
      console.error('Could not connect to MongoDB. Check your configuration.');
      await runtime.close();
      process.exitCode = 1;
    });
}
