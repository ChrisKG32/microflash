const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// projectRoot is explicit because watchFolders points at the monorepo root;
// without it NativeWind can anchor the CSS build in the wrong place.
module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: './tailwind.config.js',
  projectRoot,
});
