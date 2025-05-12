import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: true,
      // Use standard WebSocket protocol instead of wss for local development
      protocol: 'ws',
      // Use localhost instead of 0.0.0.0 for WebSocket connections
      host: 'localhost', 
      port: 9000,
    },
    host: '0.0.0.0', // Keep this for the server to listen on all interfaces
    port: parseInt(process.env.PORT || "9000", 10),
    strictPort: false, // Allow Vite to use a different port if 9000 is occupied
    cors: true,
    fs: {
      strict: false,
      allow: [".."],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      '@components': path.resolve(__dirname, "client", 'src/components'),
      '@lib': path.resolve(__dirname, "client", 'src/lib'),
      '@hooks': path.resolve(__dirname, "client", 'src/hooks'),
      '@pages': path.resolve(__dirname, "client", 'src/pages'),
      '@store': path.resolve(__dirname, "client", 'src/store'),
      '@styles': path.resolve(__dirname, "client", 'src/styles'),
      '@firebaseConfig': path.resolve(__dirname, "client", 'src/firebaseConfig.ts')
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('stripe')) return 'vendor-stripe';
            if (id.includes('lucide-react') || id.includes('radix-ui')) return 'vendor-ui';
            return 'vendor-others';
          }
        },
      },
    },
  },
});
