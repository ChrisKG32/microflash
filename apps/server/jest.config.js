const baseConfig = require('../../jest.config.base.js');

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'server',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    // Handle @/* aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle @shared/* aliases
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  // Transform ESM-only packages (p-all, p-map, etc.)
  // Pattern handles pnpm's .pnpm structure
  transformIgnorePatterns: ['/node_modules/\\.pnpm/(?!(p-all|p-map)@)'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
};

module.exports = config;
