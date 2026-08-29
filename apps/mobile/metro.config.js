const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// SDK 55's getDefaultConfig discovers the pnpm workspace on its own: it sets
// watchFolders to each workspace plus the root node_modules, and
// resolver.nodeModulesPaths to [app, root]. The hand-rolled versions of both
// that used to live here produced the same result while dropping Expo's
// defaults, which is what expo-doctor flagged.
const config = getDefaultConfig(__dirname);

// projectRoot is explicit because watchFolders reaches outside this package;
// without it NativeWind can anchor the CSS build in the wrong place.
module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: './tailwind.config.js',
  projectRoot: __dirname,
});
