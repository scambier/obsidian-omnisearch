import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import obsidianmd from 'eslint-plugin-obsidianmd'

export default defineConfig([
  {
    // Generated artifacts are not linted
    ignores: ['dist/**', 'coverage/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Config files are executed by Node, not by Obsidian
    files: [
      '.prettierrc.js',
      'version-bump.mjs',
      'esbuild.config.mjs',
      'vitest.config.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      ...obsidianmd.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
])
