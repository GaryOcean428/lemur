// This is the server entry point for Vercel
const express = require('express');
const path = require('path');
const app = express();

// Add CSP headers for WebAssembly support
app.use((req, res, next) => {
  // Set Content-Security-Policy header to allow WebAssembly and other needed features
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self'; object-src 'none'; worker-src 'self' blob:;"
  );
  
  // Add COOP and COEP headers for SharedArrayBuffer and cross-origin isolation
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API routes go here
// This would be replaced with actual API integrations
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', environment: 'vercel' });
});

// Handle client-side routing - send all non-API requests to index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start the server (for local testing - Vercel will handle this in production)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;