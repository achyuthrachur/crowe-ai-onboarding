// scripts/ingest.ts
// CLI entry point for knowledge base ingestion.
//
// IMPORTANT: tsx does NOT auto-load .env.local.
// Before running, export env vars manually:
//   export $(grep -v '^#' .env.local | xargs) && npm run ingest
//
// Or use the full one-liner:
//   export $(grep -v '^#' .env.local | xargs) && NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/ingest.ts

import path from 'path';
import { ingestAll } from '../src/lib/ingest';

const DOCS_DIR = path.join(process.cwd(), 'docs');

ingestAll(DOCS_DIR)
  .then(summary => {
    const okDocs = summary.results.length;
    const total = summary.totalChunks;
    const failedDocs = summary.errors.map(e => e.docId);

    if (failedDocs.length > 0) {
      console.log(
        `Ingested ${total} chunks from ${okDocs} documents. Failed: [${failedDocs.join(', ')}]`
      );
      process.exit(1);
    } else {
      console.log(`Ingested ${total} chunks from ${okDocs} documents.`);
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('Fatal ingest error:', err);
    process.exit(1);
  });
