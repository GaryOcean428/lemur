import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths()
  ],
  server: {
    hmr: {
      overlay: true,
      protocol: 'wss',
      host: process.env.PREVIEW_URL ? new URL(process.env.PREVIEW_URL).hostname : undefined,
      clientPort: process.env.PREVIEW_URL ? 443 : undefined,
    },
    host: true,
    port: parseInt(process.env.PORT || "9000", 10),
    strictPort: true,
    cors: true,
    fs: {
      strict: false,
      allow: [".."],  // Allow access to parent directory for shared modules
    },
  },
  build: {
    sourcemap: true,
    outDir: "../dist/public",
    emptyOutDir: true,
  }
})