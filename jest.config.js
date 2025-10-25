module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/js/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage/js',
  coverageReporters: ['html', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  collectCoverageFrom: [
    'src/js/**/*.js',
    'src/add_recording.js',
    'src/database.js',
    '!node_modules/**',
    '!tests/**',
    '!coverage/**',
    '!src/renderer.js',
    '!src/preload.js',
    '!src/history-renderer.js'
  ],
  testTimeout: 10000,
  verbose: true
};
