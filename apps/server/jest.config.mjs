import baseConfig from '../../jest.config.base.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'server',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    // Handle @/* aliases with .js extension (ESM imports)
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
    // Handle @/* aliases without extension
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle @shared/* aliases with .js extension (ESM imports)
    '^@shared/(.*)\\.js$': '<rootDir>/../../packages/shared/src/$1',
    // Handle @shared/* aliases without extension
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    // Inherit base config's .js extension handling for relative imports
    ...baseConfig.moduleNameMapper,
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
};

export default config;
