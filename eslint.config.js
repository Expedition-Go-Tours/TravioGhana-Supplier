import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Tests run in Node (fs, process) alongside the jsdom browser globals.
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // Phosphor is the Stays workspace's icon family. Only the Stays icon
    // barrel may import it directly; everything else must use that barrel (or
    // lucide for the Experiences workspace).
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/features/stays/icons/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@phosphor-icons/react',
              message:
                'Phosphor icons are Stays-only. Import from @/features/stays/icons instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Stays-owned code must not mix lucide back in. The icon barrel itself is
    // ignored because it is the one place allowed to import Phosphor.
    files: ['src/features/stays/**/*.{js,jsx}', 'src/config/staysNav.js'],
    ignores: ['src/features/stays/icons/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react',
              message:
                'The Stays workspace uses Phosphor. Import from @/features/stays/icons instead.',
            },
            {
              name: '@phosphor-icons/react',
              message:
                'Import Phosphor icons through @/features/stays/icons, not directly.',
            },
          ],
        },
      ],
    },
  },
])
