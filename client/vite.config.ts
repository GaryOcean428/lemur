import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@assets': path.resolve(__dirname, '../attached_assets'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@firebaseConfig': path.resolve(__dirname, 'src/firebaseConfig.ts')
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: path.resolve(__dirname, "..", "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('stripe')) {
              return 'vendor-stripe';
            }
            if (id.includes('lucide-react') || id.includes('radix-ui')) {
              return 'vendor-ui';
            }
            return 'vendor-others';
          }
        },
      },
    },
  },
});