const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  workers: 1,
  fullyParallel: false,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/demo-server.js',
    url: 'http://127.0.0.1:3001/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  reporter: [['list']],
});
