// Vercel Serverless Function entry point
const express = require('express');
const path = require('path');
const app = express();

// Enable JSON parsing for API requests
app.use(express.json());

// Add headers required for WebAssembly
app.use((req, res, next) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self'; object-src 'none'; worker-src 'self' blob:;"
  );
  
  // Cross-Origin isolation headers
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  
  next();
});

// Basic status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel',
    timestamp: new Date().toISOString()
  });
});

// Export the Express app as a Vercel serverless function
module.exports = app;