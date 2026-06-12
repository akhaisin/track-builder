import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/track-builder/',
  plugins: [react()],
  build: {
    // The lazy-loaded Three.js viewer chunk is ~540 kB minified.
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    environmentOptions: {
      jsdom: { url: 'http://localhost' },
    },
  },
})
