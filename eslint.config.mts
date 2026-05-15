import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      ...obsidianmd.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    rules: {
      'obsidianmd/ui/sentence-case': 'off',
      'obsidianmd/rule-custom-message': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
])
