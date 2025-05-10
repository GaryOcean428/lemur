import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Import runtimeErrorOverlay to help with error display
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; // Removed

export default defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay(), // Removed
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  server: {
    hmr: {
      overlay: true, // Changed to true
      clientPort: 9000, // Match the IDX preview port
      path: "/@vite/client/hmr", // Explicit HMR path to avoid conflicts
    },
    // Specific config for IDX environment
    strictPort: false, // Allow port fallback
    host: "0.0.0.0", // Bind to all interfaces
    port: 9000, // Match default IDX preview port
    cors: true, // Enable CORS
    fs: {
      strict: false, // Allow serving files from outside of project root
      allow: ["."], // Allow serving from the entire project
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  // Optimize for IDX environment
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split major vendor libraries into their own chunks
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
            // Catch-all for other node_modules
            return 'vendor-others';
          }
        },
      },
    },
  },
});
