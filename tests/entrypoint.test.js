const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const run = promisify(execFile);
const options = {
  cwd: path.resolve(__dirname, '..'),
  timeout: 10000,
  env: {
    ...process.env,
    // Explicitly override dotenv values: these subprocesses must never use real services.
    MONGO_URI: 'mongodb://127.0.0.1:1/entrypoint_test',
    SESSION_SECRET: 'short',
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
  },
};
test('invalid serverless configuration returns a generic uncached 503 without opening a database', async () => {
  const source = `
    const http = require('node:http');
    const handler = require('./app');
    const server = http.createServer(handler).listen(0, '127.0.0.1', async () => {
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/health');
        console.log(JSON.stringify({ status: response.status, body: await response.json(),
          cache: response.headers.get('cache-control'), nosniff: response.headers.get('x-content-type-options') }));
      } finally { server.close(); }
    });
  `;
  const { stdout, stderr } = await run(process.execPath, ['-e', source], options);
  assert.deepEqual(JSON.parse(stdout), {
    status: 503,
    body: { success: false, message: 'Service temporarily unavailable.' },
    cache: 'no-store',
    nosniff: 'nosniff',
  });
  assert.deepEqual(JSON.parse(stderr), { event: 'configuration_invalid' });
});
test('invalid CLI configuration exits with failure and a safe diagnostic', async () => {
  await assert.rejects(run(process.execPath, ['app.js'], options), (error) => {
    assert.equal(error.code, 1);
    assert.deepEqual(JSON.parse(error.stderr), { event: 'configuration_invalid' });
    assert.equal(error.stdout, '');
    return true;
  });
});
