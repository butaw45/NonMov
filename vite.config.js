import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // hls.js cukup besar; pisahkan supaya chunk halaman tonton tidak raksasa
        manualChunks: {
          hls: ['hls.js'],
        },
      },
    },
  },
})
