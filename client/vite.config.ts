import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts'
          if (id.includes('framer-motion')) return 'framer-motion'
          if (id.includes('lucide-react')) return 'lucide-react'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/'))
            return 'react-vendor'
        },
      },
    },
  },
})
