const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required (Neon connection string).');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL; Neon's cert chain isn't in the default CA bundle
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  // Fires on idle client errors (e.g. connection dropped by Neon's pooler) — don't let it crash the process.
  console.error('Unexpected Postgres pool error:', err);
});

module.exports = pool;
