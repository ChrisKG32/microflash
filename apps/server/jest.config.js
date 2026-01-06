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
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
};

module.exports = config;
