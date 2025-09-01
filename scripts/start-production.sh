#!/bin/bash
# Production start script for Railway deployment

# Set production environment
export NODE_ENV=production

# Start the application
node dist/index.js