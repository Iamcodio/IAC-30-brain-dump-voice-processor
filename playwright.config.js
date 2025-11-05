/**
 * Playwright configuration for Electron E2E testing
 */

module.exports = {
  testDir: './tests/e2e',
  timeout: 60000, // Increased from 30s to 60s for Electron startup
  retries: 1, // Retry once on failure to handle flaky tests
  workers: 1, // Run tests serially to avoid Electron instance conflicts
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Reduce noise from fixture cleanup warnings
  maxFailures: 10, // Stop after 10 failures to avoid log spam
};
