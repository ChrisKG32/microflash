/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/apps/server/jest.config.mjs',
    // Future packages can be added here:
    // '<rootDir>/apps/client/jest.config.mjs',
    // '<rootDir>/packages/shared/jest.config.mjs',
  ],
};

export default config;
