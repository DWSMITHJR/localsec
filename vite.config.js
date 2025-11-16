import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 3000,
    fs: {
      strict: false
    },
    open: true,
    host: true
  },
  
  // Configure MIME types for JSX files
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      next();
    });
  },
  
    
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@components': resolve(__dirname, 'src/components')
    }
  },
  
  // Define global variables
  define: {
    global: 'globalThis'
  },
  
  // Optimize dependencies
  optimizeDeps: {
    exclude: ['crypto-js', 'lodash']
  },
  
  // CSS configuration
  css: {
    postcss: {
      plugins: [
        require('autoprefixer')
      ]
    }
  }
})
