module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource routes JSX through NativeWind so `className` works on
      // the automatic runtime. The gluestack starter omitted this.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // gluestack's tva/twMerge helpers resolve the bare specifier
      // `tailwind.config`. Metro reads tsconfig `paths` for `@/*` already,
      // so this alias is the only one needed.
      [
        'module-resolver',
        { root: ['./'], alias: { 'tailwind.config': './tailwind.config.js' } },
      ],
      // react-native-reanimated/plugin is now just a re-export of this.
      // Must stay last.
      'react-native-worklets/plugin',
    ],
  };
};
