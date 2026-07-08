import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  define: {
    global: 'window',
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        // Rewrite cookie domain so browser accepts HttpOnly cookies (e.g. refresh_token)
        // set by the backend on port 8080, when running on localhost:5173
        cookieDomainRewrite: "localhost"
      }
    },
    host: true,
    allowedHosts: [
      'hyperdolichocephalic-aerodynamic-ashlee.ngrok-free.dev',
      '.ngrok-free.dev'
    ]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@mui/x-data-grid', '@mui/x-date-pickers'],
          'fullcalendar': ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/interaction', '@fullcalendar/list', '@fullcalendar/timegrid'],
          'chart-vendor': ['apexcharts', 'react-apexcharts'],
          'editor-vendor': ['@tiptap/react', '@tiptap/starter-kit']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
