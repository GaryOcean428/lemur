import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local if it exists
const dotenvPath = join(__dirname, '..', '.env.local');
const require = createRequire(import.meta.url);
require('dotenv').config({ path: dotenvPath });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Add connection retry options for better resilience
const poolOptions = {
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout
  max: 20, // Maximum 20 clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  allowExitOnIdle: false, // Don't allow the pool to exit while the server is running
  // Add retryStrategy
  retryStrategy: (err: any, attempts: number) => {
    // Only retry 3 times, with exponential backoff
    if (attempts > 3) return null;
    // Exponential backoff with jitter
    const delay = Math.min(100 * Math.pow(2, attempts), 3000);
    return delay + Math.floor(Math.random() * 100);
  },
};

export const pool = new neon(poolOptions);
export const db = drizzle({ client: pool, schema });

// Log pool status on creation
pool.on('connect', () => {
  console.log('Database pool new connection established');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

// Test the connection to make sure it's working
pool.query('SELECT NOW()')
  .then(() => console.log('Database connection successful'))
  .catch(err => console.error('Database connection test failed:', err.message));
