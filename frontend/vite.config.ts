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
      // Este proxy es solo para desarrollo local: permite correr un printer-client
      // apuntando a ws://localhost:5173/print-api/ws/printer contra el print-service
      // de esta maquina. En produccion NO corre `vite dev`; el reenvio equivalente
      // esta en el Vhost Editor de CloudPanel (location /print-api/ con Upgrade/
      // Connection). Ojo: el printer-client del local apunta al dominio de
      // produccion, asi que para probar impresion en desarrollo hay que levantar
      // uno propio.
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
