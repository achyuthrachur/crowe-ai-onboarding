// scripts/migrate.ts
// Creates the doc_chunks table in Neon Postgres.
// Idempotent: CREATE EXTENSION IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
// Run: NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/migrate.ts
//
// NOTE: No IVFFlat index is created here.
// IVFFlat must be created AFTER data is loaded (Phase 3).
// A pre-data index is silently useless and wastes write overhead.

import { sql } from '../src/lib/db';

async function migrate() {
  console.log('Enabling pgvector extension...');
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  console.log('Creating doc_chunks table...');
  await sql`
    CREATE TABLE IF NOT EXISTS doc_chunks (
      id          SERIAL PRIMARY KEY,
      doc_id      TEXT NOT NULL,
      doc_title   TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content     TEXT NOT NULL,
      embedding   vector(1536),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
