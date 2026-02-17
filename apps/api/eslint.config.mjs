import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // ✅ Ignore build + generated folders
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs', '.turbo/**'],
  },

  // ✅ Base JS rules
  eslint.configs.recommended,

  // ✅ TypeScript recommended rules
  ...tseslint.configs.recommended,

  // ✅ Prettier disables conflicting formatting rules
  prettier,

  // ✅ Type-aware linting (Nest + Prisma)
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // 🔥 Useful backend rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
);
