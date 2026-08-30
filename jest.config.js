/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/apps/server/jest.config.js',
    '<rootDir>/apps/mobile/jest.config.cjs',
  ],
};

module.exports = config;
