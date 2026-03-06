import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'production'
      ? [legacy({ targets: ['chrome >= 68', 'safari >= 12'] })]
      : []),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    // No explicit build.target — modern bundle uses Vite default (esnext).
    // Legacy browser support (Chrome 68+, Safari 12+) handled by plugin-legacy above.
    sourcemap: mode === 'development' ? 'inline' as const : true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('@volley/') || id.includes('@weekend-casino/'))
            return 'shared-core-deps'
          if (id.includes('three') || id.includes('@react-three'))
            return 'three-vendor'
          if (id.includes('react-dom')) return 'react-dom'
          if (id.includes('/react/')) return 'react'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
}))
