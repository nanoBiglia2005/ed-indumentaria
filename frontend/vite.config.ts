import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),],
  server: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:5000',
        secure: false,
      },
      '/print-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/print-api/, ''),
      }
    }
  },
  build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    }
})
