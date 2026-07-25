import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const rootEnvDir = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '')

  return {
    envDir: rootEnvDir,
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
          target: env.VITE_DEV_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
          // Rewrite cookie domain so browser accepts HttpOnly cookies (e.g. refresh_token)
          // set by the backend on port 8080, when running on localhost:5173
          cookieDomainRewrite: "localhost",
          // Vite may run on 5173/5174/... — rewrite Origin so Spring CORS does not reject the proxied call
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("Origin", "http://localhost:5173");
              proxyReq.setHeader("Referer", "http://localhost:5173/");
            });
          },
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
    },
  }
})
