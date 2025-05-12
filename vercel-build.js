// vercel-build.js - Custom build script for Vercel deployment
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure necessary environment variables are available
console.log('Setting up Vercel build environment...');

// Run the standard build process
console.log('Building application...');
execSync('npm run build', { stdio: 'inherit' });

// Create a _headers file in the output directory to set CSP headers
// This will ensure WebAssembly can run properly in the Vercel environment
const outputDir = path.join(__dirname, 'dist');
const headersFilePath = path.join(outputDir, '_headers');

const headersContent = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https://* wss://*; font-src 'self' data: https://fonts.gstatic.com; frame-src 'self'; object-src 'none'; worker-src 'self' blob:;
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
`;

fs.writeFileSync(headersFilePath, headersContent);
console.log('Created _headers file with WebAssembly-compatible CSP settings');

console.log('Vercel build completed successfully!');