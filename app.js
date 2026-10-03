require('dotenv').config({ quiet: true });
const { readConfig } = require('./src/config/env');
const { createRuntime } = require('./src/server');
const config = readConfig();
const runtime = createRuntime(config);
module.exports = runtime.handler;
if (require.main === module) {
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
