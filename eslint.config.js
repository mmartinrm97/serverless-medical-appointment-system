import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.serverless/',
      'coverage/',
      '.esbuild/',
    ],
  },
  
  // Base JavaScript configuration
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  
  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended[1].rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'args': 'after-used',
        'ignoreRestSiblings': true,
        'destructuredArrayIgnorePattern': '^_'
      }],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-template': 'error',
    },
  },
  
  // Domain interfaces and entities configuration
  {
    files: ['**/domain/**/I*.ts', '**/repositories/**/*.ts', '**/services/**/I*.ts', '**/entities/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },

  // Use Cases and Application Services - allow constructor parameters
  {
    files: ['**/use-cases/**/*.ts', '**/application/services/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true,
        'args': 'none' // Ignore constructor parameters
      }],
      'no-unused-vars': 'off',
    },
  },

  // Infrastructure components - allow constructor parameters and private properties
  {
    files: ['**/infrastructure/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true,
        'args': 'none' // Ignore constructor parameters
      }],
      'no-unused-vars': 'off',
    },
  },

  // Test files configuration
  {
    files: ['**/__tests__/**/*', '**/*.{test,spec}.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        vitest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];