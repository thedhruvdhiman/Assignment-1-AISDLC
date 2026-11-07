import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

const typedFiles = ['backend/**/*.{ts,tsx}', 'frontend/**/*.{ts,tsx}'];

export default [
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: config.files ?? typedFiles,
  })),
  ...vue.configs['flat/essential'].map((config) => ({
    ...config,
    files: config.files ?? ['frontend/**/*.vue'],
  })),
  {
    files: [...typedFiles, 'frontend/**/*.vue'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      vue,
    },
    languageOptions: {
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
      },
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'vue/multi-word-component-names': 'off',
    },
  },
];
