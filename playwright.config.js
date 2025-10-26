/**
 * Playwright configuration for Electron E2E testing
 */

module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
};
