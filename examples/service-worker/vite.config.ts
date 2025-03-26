import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      srcDir: 'src/service-worker',
      filename: 'index.ts',
      strategies: 'injectManifest',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})
