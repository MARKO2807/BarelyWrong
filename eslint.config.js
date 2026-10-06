import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Local storage is only touched through src/storage (see CLAUDE.md).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/storage/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use src/storage instead.' },
        { name: 'sessionStorage', message: 'Use src/storage instead.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Use src/storage instead.' },
        { object: 'window', property: 'sessionStorage', message: 'Use src/storage instead.' },
      ],
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
