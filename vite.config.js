import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
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
