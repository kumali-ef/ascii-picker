import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sample: resolve(__dirname, 'sample.html'),
      }
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}']
      },
      manifest: {
        name: 'ASCII Picker',
        short_name: 'Picker',
        description: 'Random standup host picker with ASCII art animation',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  test: {
    environment: 'node'
  }
})
