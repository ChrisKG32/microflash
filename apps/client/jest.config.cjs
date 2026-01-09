/** @type {import('jest').Config} */
module.exports = {
  displayName: 'client',
  preset: 'jest-expo',
  rootDir: '.',
  roots: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  moduleNameMapper: {
    // Handle @/* path alias from tsconfig.json
    '^@/(.*)$': '<rootDir>/$1',
    // Map workspace packages to their source
    '^@microflash/api-client$':
      '<rootDir>/../../packages/api-client/src/index.ts',
  },
  // pnpm hoists packages to root node_modules/.pnpm, so we need patterns that work
  // for both the local node_modules symlinks AND the hoisted .pnpm structure.
  // The key insight: .pnpm packages are at node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/
  // So we need to match the inner node_modules path as well.
  transformIgnorePatterns: [
    // Match node_modules but NOT if followed by .pnpm or specific packages we need transformed
    'node_modules/(?!' +
      '\\.pnpm/' + // Allow .pnpm directory
      '|' +
      '((jest-)?react-native|' +
      '@react-native|' +
      'expo|' +
      '@expo|' +
      'react-navigation|' +
      '@react-navigation|' +
      '@unimodules|' +
      'unimodules|' +
      'native-base|' +
      'react-native-svg|' +
      'react-native-reanimated|' +
      'react-native-gesture-handler|' +
      'react-native-screens|' +
      'react-native-safe-area-context|' +
      'react-native-web|' +
      '@microflash)' +
      ')',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/node_modules/**',
    '!**/.expo/**',
    '!**/scripts/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
