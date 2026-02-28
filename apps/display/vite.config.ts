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
    target: 'es2015',
  },
}))
