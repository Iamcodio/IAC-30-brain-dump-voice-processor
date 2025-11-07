module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).js',
    '**/?(*.)+(spec|test).js',
    '**/__tests__/**/*.(test|spec).ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
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
    'src/**/*.{js,ts}',
    'main.{js,ts}',
    'database.{js,ts}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!tests/**',
    '!coverage/**',
    '!src/renderer.js',
    '!src/preload.js',
    '!src/history-renderer.js'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  testTimeout: 10000,
  verbose: true
};
