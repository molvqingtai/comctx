import { defineConfig } from 'wxt'
import path from 'node:path'
import { name } from './package.json'

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: path.resolve('src'),
  entrypointsDir: 'app',
  imports: false,
  webExt: {
    startUrls: ['https://www.example.com/']
  },
  manifest: () => {
    return {
      name: name,
      permissions: ['tabs', 'webNavigation']
    }
  }
})
