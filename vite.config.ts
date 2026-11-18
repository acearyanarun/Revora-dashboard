/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `SINGLE_FILE=1 npm run build` produces one self-contained index.html (used for the hosted demo).
export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.SINGLE_FILE ? [viteSingleFile()] : [])],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
