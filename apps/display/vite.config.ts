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
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'r3f': ['@react-three/fiber'],
          'drei': ['@react-three/drei'],
          'postprocessing': ['@react-three/postprocessing'],
        },
      },
    },
  },
}))
