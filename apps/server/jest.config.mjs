import baseConfig from '../../jest.config.base.mjs';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  displayName: 'server',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@microflash/shared$': '<rootDir>/../../packages/shared/src',
  },
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
};

export default config;
