// This script runs after the build to add necessary meta tags and configurations for Vercel deployment
const fs = require('fs');
const path = require('path');

// Path to the built index.html
const indexPath = path.join(__dirname, 'dist', 'index.html');

try {
  // Read the existing index.html
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Check if we need to add the cross-origin isolation meta tags
  if (!html.includes('Cross-Origin-Embedder-Policy') && !html.includes('Cross-Origin-Opener-Policy')) {
    // Add meta tags for cross-origin isolation right after the <head> tag
    html = html.replace('<head>', `<head>
    <!-- Meta tags for WebAssembly support -->
    <meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
    <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">
    <!-- End of WebAssembly support meta tags -->`);
    
    // Write the updated HTML back to the file
    fs.writeFileSync(indexPath, html);
    console.log('Successfully added WebAssembly support meta tags to index.html');
  } else {
    console.log('WebAssembly support meta tags already exist in index.html');
  }
} catch (error) {
  console.error('Error updating index.html:', error);
  process.exit(1);
}