import globals from 'globals'
import pluginJs from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettierPlugin,
  {
    ignores: ['**/dist/*', '**/.output/*', '**/.wxt/*']
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  }
])
