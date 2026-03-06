import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5174,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom')) return 'react-dom'
          if (id.includes('/react/')) return 'react'
          if (id.includes('@volley/') || id.includes('@weekend-casino/'))
            return 'shared-core'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
