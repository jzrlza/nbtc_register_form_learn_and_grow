import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      host: '0.0.0.0',  // Accessible from other devices on network
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true
        },
        '/ws': {
          target: env.VITE_WS_URL || 'ws://localhost:3000', //for real time
          ws: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  }
})