import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    // Allow your production domain to access Vite preview behind proxy
    allowedHosts: ['autofood.com.br', 'www.autofood.com.br']
  }
})
