import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app works when hosted at any sub-path,
  // e.g. https://<user>.github.io/<repo>/ on GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
})
