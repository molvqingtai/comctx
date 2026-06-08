import { defineConfig } from 'tsdown'
import process from 'node:process'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  entry: {
    index: './src/index.ts'
  },
  format: 'esm',
  dts: true,
  sourcemap: !isProduction,
  minify: isProduction,
  watch: !isProduction,
  clean: true,
  hash: false,
  fixedExtension: false,
  banner: {
    js: '/* @ts-self-types="./index.d.ts" */'
  }
})
