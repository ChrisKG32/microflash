/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/apps/server/jest.config.js',
    '<rootDir>/apps/mobile/jest.config.cjs',
    // Future packages can be added here:
    // '<rootDir>/packages/shared/jest.config.js',
  ],
};

module.exports = config;
