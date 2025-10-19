import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';

export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-native': reactNative,
    },
    rules: {
      ...typescript.configs.recommended.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['apps/server/**/*.{ts,tsx,js}', 'packages/shared/**/*.{ts,tsx,js}'],
    rules: {
      ...react.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'node_modules',
      'dist',
      'build',
      'client',
      'coverage',
      '*.config.js',
    ],
  },
];
