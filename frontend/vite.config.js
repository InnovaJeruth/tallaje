import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Esto permite que ngrok acceda al servidor de Vite
    allowedHosts: [
      'unstriped-uncongenially-terrence.ngrok-free.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})