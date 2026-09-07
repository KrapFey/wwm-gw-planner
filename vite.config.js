import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' keeps asset paths relative so the built app works when hosted
// at any sub-path (Oracle Cloud bucket, nginx sub-folder, etc.) or opened
// straight from disk.
export default defineConfig({
  base: './',
  // Konva makes the single bundle ~0.5 MB; that's expected for this app.
  build: { chunkSizeWarningLimit: 800 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WWM Guild War Planner',
        short_name: 'GW Planner',
        description:
          'Offline-capable Guild War strategy planner for Where Winds Meet',
        theme_color: '#0a0b0f',
        background_color: '#0a0b0f',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The GvG map image is ~2 MB; precache it so the app is fully offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ]
})
