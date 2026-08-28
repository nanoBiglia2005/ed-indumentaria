import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@backend': resolve(__dirname, '../backend'),
    },
  },
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
      // NO BORRAR: este proxy no lo usa el frontend, lo usa el printer-client.
      // Con ngrok apuntando a este dev server, la PC de la impresora se conecta
      // a wss://<ngrok>/print-api/ws/printer y Vite lo reenvia al print-service
      // (por eso `ws: true`). Al migrar a un server real hay que replicar este
      // reenvio en nginx: en produccion no corre `vite dev` y este proxy no existe.
      '/print-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/print-api/, ''),
      },
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
