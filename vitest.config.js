import { defineConfig } from 'vitest/config'

// Standalone config so tests don't load the Vite PWA plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}']
  }
})
