import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev proxy: request /3/** dan /api/** diteruskan ke backend lokal (port 4001).
    // Dengan ini API key TMDB tetap di server; frontend tidak perlu tahu kredensial.
    proxy: {
      '/3': 'http://localhost:4001',
      '/api': 'http://localhost:4001',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // hls.js cukup besar; pisahkan supaya chunk halaman tonton tidak raksasa
        // (Vite 8/Rolldown: manualChunks object dihapus — pakai codeSplitting.groups)
        codeSplitting: {
          groups: [{ name: 'hls', test: 'hls.js' }],
        },
      },
    },
  },
})
