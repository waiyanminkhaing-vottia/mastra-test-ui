import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  ...compat.extends('prettier'),
  {
    plugins: {
      prettier: (await import('eslint-plugin-prettier')).default,
      'simple-import-sort': (await import('eslint-plugin-simple-import-sort'))
        .default,
      'unused-imports': (await import('eslint-plugin-unused-imports')).default,
      jsdoc: (await import('eslint-plugin-jsdoc')).default,
      sonarjs: (await import('eslint-plugin-sonarjs')).default,
    },
    rules: {
      'prettier/prettier': 'error',
      // Import sorting
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Remove unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // Import rules
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      // JSDoc rules
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          contexts: [
            'ExportNamedDeclaration[declaration.type="FunctionDeclaration"]',
            'ExportDefaultDeclaration[declaration.type="FunctionDeclaration"]',
            'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
          ],
          exemptEmptyFunctions: true,
          checkConstructors: false,
          publicOnly: true,
        },
      ],
      'jsdoc/require-description': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/valid-types': 'error',
      // Security & Quality Rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': 'off', // Disabled in favor of unused-imports plugin
      // React Rules (built into next/core-web-vitals but adding specific ones)
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/no-array-index-key': 'warn',
      'react/jsx-boolean-value': 'error',
      'react/self-closing-comp': 'error',
      // TypeScript Rules
      '@typescript-eslint/no-unused-vars': 'off', // Handled by unused-imports
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Cognitive Complexity & Code Quality Rules
      'sonarjs/cognitive-complexity': ['error', 15], // Max cognitive complexity of 15
      'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }], // Warn on 3+ duplicate strings
      'sonarjs/no-identical-functions': 'warn', // Detect identical functions
      'sonarjs/no-collapsible-if': 'warn', // Suggest collapsing nested ifs
      'sonarjs/prefer-immediate-return': 'warn', // Prefer immediate returns
      'sonarjs/prefer-object-literal': 'warn', // Prefer object literals
      'sonarjs/prefer-single-boolean-return': 'warn', // Simplify boolean returns
      'sonarjs/no-small-switch': 'warn', // Suggest if-else for small switches
      'sonarjs/no-redundant-boolean': 'warn', // Remove redundant boolean casts
      'sonarjs/no-inverted-boolean-check': 'warn', // Avoid inverted boolean checks
      // Deprecated usage detection (generic for all libraries)
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'CallExpression[callee.name=/.*[Dd]eprecated.*/]',
          message: 'Do not use deprecated functions.',
        },
        {
          selector: 'MemberExpression[property.name=/.*[Dd]eprecated.*/]',
          message: 'Do not use deprecated properties or methods.',
        },
        {
          selector: 'ImportDeclaration[source.value=/.*deprecated.*/i]',
          message: 'Do not import from deprecated modules.',
        },
      ],
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['**/deprecated/**'],
              message: 'Do not import from deprecated modules.',
            },
            {
              group: ['**/*deprecated*'],
              message: 'Do not import deprecated functions or modules.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'sonarjs/no-duplicate-string': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.turbo/**',
      'coverage/**',
      '*.log',
    ],
  },
];

export default eslintConfig;
