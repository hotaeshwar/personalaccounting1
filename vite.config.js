import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/', // ✅ Very important for GitHub Pages with custom domain
  preview: {
    allowedHosts: ['accountsonline.info'],
  },
})
