module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['standard'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'arrow-parens': ['error', 'as-needed'],
    'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
    'func-call-spacing': 'off',
    // unused vars - fix for enums
    'no-unused-vars': ['off'],
    '@typescript-eslint/no-unused-vars': ['warn'],
    // no redeclare - fix for overloading
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': ['error'],
    // 'simple-import-sort/imports': 'warn',
    // 'simple-import-sort/exports': 'warn',
    '@typescript-eslint/func-call-spacing': ['error'],
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
        allowConciseArrowFunctionExpressionsStartingWithVoid: false,
      },
    ],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
  },
}
