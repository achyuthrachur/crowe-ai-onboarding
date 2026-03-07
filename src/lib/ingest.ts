// src/lib/ingest.ts
// Shared ingestion module — called by scripts/ingest.ts (CLI) and src/app/api/ingest/route.ts (HTTP).
// Pipeline: read markdown → chunk → batch embed (one OpenAI call per doc) → DELETE+INSERT → IVFFlat index
//
// IMPORTANT: This file must be imported with env vars already loaded.
// tsx does NOT auto-load .env.local — callers must export env vars before running.

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { sql } from './db';
import { chunkMarkdown } from './chunker';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Files to skip when scanning docs/
const SKIP_FILES = new Set(['00-PRD.md', 'CLAUDE.md', 'DESIGN.md']);

export interface IngestResult {
  docId: string;
  docTitle: string;
  chunksIngested: number;
}

export interface IngestError {
  docId: string;
  error: string;
}

export interface IngestSummary {
  results: IngestResult[];
  errors: IngestError[];
  totalChunks: number;
}

/**
 * Ingest a single markdown document.
 * - docId: filename without extension (e.g. '01-getting-started')
 * - docTitle: first # H1 heading, or docId as fallback
 * - Idempotent: DELETEs existing rows for docId before inserting new ones
 * - Batch embeds all chunks in a single openai.embeddings.create call
 */
export async function ingestDoc(filePath: string): Promise<IngestResult> {
  const filename = path.basename(filePath);
  const docId = path.basename(filePath, '.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract docTitle from first H1 heading
  const titleMatch = content.match(/^# (.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : docId;

  // Chunk the document
  const chunks = chunkMarkdown(content, docId, docTitle);
  if (chunks.length === 0) {
    return { docId, docTitle, chunksIngested: 0 };
  }

  // Batch embed all chunks in a single API call
  // CRITICAL: One call per doc (not per chunk) — avoids rate limits and Vercel timeout
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks.map(c => c.content),
  });
  // response.data is ordered to match input — index alignment is safe
  const embeddings: number[][] = embeddingResponse.data.map(d => d.embedding);

  // Idempotency: delete existing rows for this docId before inserting
  await sql`DELETE FROM doc_chunks WHERE doc_id = ${docId}`;

  // Insert all chunks — one INSERT per chunk (sequential, ~12 round-trips per doc)
  // Note: @neondatabase/serverless sql tag does NOT auto-cast number[] to vector.
  // Must use JSON.stringify(embedding) + ::vector cast explicitly.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    await sql`
      INSERT INTO doc_chunks (doc_id, doc_title, chunk_index, content, embedding)
      VALUES (
        ${chunk.docId},
        ${chunk.docTitle},
        ${chunk.chunkIndex},
        ${chunk.content},
        ${JSON.stringify(embedding)}::vector
      )
    `;
  }

  console.log(`Ingesting ${filename}... ${chunks.length} chunks`);
  return { docId, docTitle, chunksIngested: chunks.length };
}

/**
 * Ingest all markdown documents in a directory.
 * - Skips 00-PRD.md, CLAUDE.md, DESIGN.md and any non-.md files
 * - Continue-on-error: collects per-doc failures without aborting
 * - Builds IVFFlat index AFTER all docs are inserted (including partial failures)
 *   IVFFlat must be built after data exists — building on empty table is silently useless
 */
export async function ingestAll(docsDir: string): Promise<IngestSummary> {
  const docFiles = fs.readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !SKIP_FILES.has(f))
    .sort();

  const results: IngestResult[] = [];
  const errors: IngestError[] = [];

  for (const filename of docFiles) {
    const filePath = path.join(docsDir, filename);
    try {
      const result = await ingestDoc(filePath);
      results.push(result);
    } catch (err) {
      const docId = path.basename(filename, '.md');
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${filename} — ${message}`);
      errors.push({ docId, error: message });
    }
  }

  // Build IVFFlat index AFTER all data is loaded
  // CREATE INDEX IF NOT EXISTS is idempotent — safe to run on re-ingest
  // lists=100 is appropriate for ~100 rows (guideline: lists = sqrt(rows))
  await sql`
    CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
    ON doc_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
  `;

  const totalChunks = results.reduce((sum, r) => sum + r.chunksIngested, 0);
  return { results, errors, totalChunks };
}
