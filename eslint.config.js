const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['apps/server/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
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
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Forbid .js extensions in imports (to prevent ESM-style imports)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*/*.js', './*.js', '../*.js', '../**/*.js'],
              message:
                'Do not use .js extensions in imports. Use extensionless imports instead.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      '**/*.config.js',
      '**/.expo/**',
      '**/apps/client/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/pnpm-lock.yaml',
      'apps/client/expo-env.d.ts',
      '**/generated/**',
      '**/scripts/**',
    ],
  },
];
