const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      '.vercel/**',
      '.idea/**',
      '.cache/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-constant-binary-expression': 'error',
    },
  },
  {
    files: ['src/public/js/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['tests/browser/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
