import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress all warnings to allow build to complete
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return
        if (warning.code === 'CIRCULAR_DEPENDENCY') return
        warn(warning)
      }
    }
  },
  esbuild: {
    // Disable TypeScript checking during build
    legalComments: 'none'
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    open: true
  }
})
