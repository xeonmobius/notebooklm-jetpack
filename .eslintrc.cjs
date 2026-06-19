module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    browser: true,
    node: true,
    es2022: true,
    webextensions: true,
  },
  ignorePatterns: ['dist/', '.output/', '.wxt/', 'tests/pdf-*.mjs'],
  rules: {
    // ponytail: base rule can't see TS types, delegate to @typescript-eslint plugin.
    'no-unused-vars': 'off',
    // ponytail: codebase uses intentional `any` on external API responses (youtube,
    // podcast __NEXT_DATA__). Track as warnings, not hard errors. Proper typing
    // tracked as audit follow-up.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
