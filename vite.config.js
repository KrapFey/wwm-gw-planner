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
      includeAssets: ['favicon.svg', 'icons/*.png'],
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
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // Non-latin Inter subsets aren't needed offline for an English UI —
        // still served on demand, just not precached.
        globIgnores: [
          '**/inter-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*'
        ]
      }
    })
  ]
})
