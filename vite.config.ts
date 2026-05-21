import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // CRITICAL for Electron: assets must use relative paths, not absolute /assets/...
  base: './',
  build: {
    outDir: 'dist',
  },
})
