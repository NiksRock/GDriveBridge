import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';

import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // ✅ Global ignores
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**', '.turbo/**'],
  },

  // ✅ Base JS rules
  js.configs.recommended,

  // ✅ TypeScript recommended rules
  ...tseslint.configs.recommended,

  // ✅ Prettier disables conflicting ESLint formatting rules
  prettier,

  // ✅ Next + React full rules (type-aware)
  {
    files: ['**/*.{ts,tsx}'],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': next,
    },

    rules: {
      // ✅ React rules
      ...react.configs.recommended.rules,

      // ✅ Hooks rules (important)
      ...reactHooks.configs.recommended.rules,

      // ✅ Accessibility rules
      ...jsxA11y.configs.recommended.rules,

      // ✅ Next.js rules
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,

      // ✅ React 19 fix
      'react/react-in-jsx-scope': 'off',
    },

    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
