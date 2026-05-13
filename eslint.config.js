import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
      globals: { ...globals.browser, ...globals.node }
    },
    plugins: { '@typescript-eslint': ts },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-unused-vars': 'off',
      // TypeScript handles undefined-symbol detection; disable to avoid flagging
      // DOM type names (CanvasImageSource, etc.) which are types not runtime.
      'no-undef': 'off'
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: tsParser, extraFileExtensions: ['.svelte'] },
      globals: {
        ...globals.browser,
        // Svelte 5 runes
        $state: 'readonly',
        $derived: 'readonly',
        $effect: 'readonly',
        $props: 'readonly',
        $bindable: 'readonly',
        $inspect: 'readonly',
        $host: 'readonly'
      }
    },
    plugins: { svelte },
    rules: {
      ...svelte.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/service-worker.ts'],
    languageOptions: {
      globals: { ...globals.serviceworker }
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    ignores: ['node_modules', '.svelte-kit', 'build', 'dist', 'static/mediapipe']
  },
  prettier
];
