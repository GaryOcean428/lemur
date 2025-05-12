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

// Create the neon client with the connection string
export const pool = neon(process.env.DATABASE_URL!);

// Initialize drizzle with the neon client and schema
export const db = drizzle(pool, { schema });

// Test the connection to make sure it's working
pool('SELECT NOW()')
  .then(() => console.log('Database connection successful'))
  .catch((error: Error) => console.error('Database connection test failed:', error.message));
