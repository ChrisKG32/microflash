/** @type {import('jest').Config} */
const config = {
  projects: [
    '<rootDir>/apps/server/jest.config.mjs',
    '<rootDir>/apps/client/jest.config.cjs',
    // Future packages can be added here:
    // '<rootDir>/packages/shared/jest.config.mjs',
  ],
};

export default config;
