// src/app/api/ingest/route.ts
// HTTP entry point for knowledge base ingestion.
// Protected by x-ingest-secret header — fail-closed:
//   - Missing/empty INGEST_SECRET env var → 500 (server misconfiguration)
//   - Wrong or missing header → 401 (unauthorized)
//
// IMPORTANT: export const maxDuration = 60 must remain at the TOP LEVEL.
// Vercel reads this at build time to extend the function timeout from 10s to 60s.
// Moving it inside the handler or making it non-exported breaks the timeout extension.

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { ingestDoc, ingestAll } from '@/lib/ingest';

// Top-level Vercel timeout extension — MUST be top-level named export
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Fail-closed: if INGEST_SECRET is not configured, refuse entirely.
  // Use !secret (not === undefined) to catch empty string as well.
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'INGEST_SECRET not configured' },
      { status: 500 }
    );
  }

  // Auth check: x-ingest-secret header must match env var exactly
  const provided = request.headers.get('x-ingest-secret');
  if (provided !== secret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse optional body: { docId?: string }
  // request.json() throws if body is empty or malformed — catch and default to {}
  const body = await request.json().catch(() => ({})) as { docId?: string };
  const { docId } = body;

  const DOCS_DIR = path.join(process.cwd(), 'docs');

  if (docId) {
    // Single-doc re-ingest: skip IVFFlat index rebuild (index already exists)
    const filePath = path.join(DOCS_DIR, `${docId}.md`);
    try {
      const result = await ingestDoc(filePath);
      return NextResponse.json(
        { ingested: result.chunksIngested, docs: [result.docId] },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Failed to ingest ${docId}: ${message}` },
        { status: 500 }
      );
    }
  }

  // Full re-ingest: all docs + IVFFlat index rebuild
  const summary = await ingestAll(DOCS_DIR);
  return NextResponse.json(
    {
      ingested: summary.totalChunks,
      docs: summary.results.map(r => r.docId),
    },
    { status: 200 }
  );
}
