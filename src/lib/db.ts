// src/lib/db.ts
// Neon serverless Postgres client
// Uses POSTGRES_URL_NON_POOLING — NOT DATABASE_URL.
// Reason: pgvector requires a session-level (non-pooled) connection.
// DATABASE_URL routes through Pgbouncer which breaks pgvector session state.
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  throw new Error('POSTGRES_URL_NON_POOLING environment variable is not set');
}

export const sql = neon(connectionString);
