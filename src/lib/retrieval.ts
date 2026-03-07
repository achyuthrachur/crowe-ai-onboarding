// src/lib/retrieval.ts
// retrieveChunks takes a pre-computed embedding (number[]) — embedding is done in the route.
// This keeps retrieval.ts a pure DB module with no OpenAI dependency.
// Pure helpers (condense, truncate, deduplicate) are exported for unit testing.
//
// NOTE: db.ts is NOT imported at the top level. The dynamic import inside retrieveChunks
// ensures db.ts (which throws if POSTGRES_URL_NON_POOLING is missing) is never evaluated
// when running unit tests for the pure helpers.

export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  content: string;
  similarity: number;
}

/**
 * Query pgvector for the top-k most similar chunks to the given embedding.
 *
 * The <=> operator returns cosine DISTANCE (0 = identical, 2 = opposite).
 * We convert to cosine SIMILARITY by computing 1 - distance.
 * Threshold 0.3 is a similarity floor: chunks below 0.3 similarity are off-topic.
 *
 * @neondatabase/serverless does NOT auto-cast number[] to vector.
 * JSON.stringify(embedding)::vector is the required explicit cast pattern.
 *
 * db.ts is dynamically imported to avoid evaluating POSTGRES_URL_NON_POOLING
 * at module load time (which would break unit tests for the pure helpers).
 */
export async function retrieveChunks(embedding: number[]): Promise<RetrievedChunk[]> {
  const { sql } = await import('./db');
  // pgvector <=> operator returns cosine DISTANCE (0 = identical, 2 = opposite).
  // We convert to cosine SIMILARITY by computing 1 - distance.
  // Threshold 0.3 is a similarity floor: chunks below 0.3 similarity are off-topic.
  const rows = await sql`
    SELECT
      doc_id    AS "docId",
      doc_title AS "docTitle",
      content,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM doc_chunks
    WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.3
    ORDER BY similarity DESC
    LIMIT 5
  ` as { docId: string; docTitle: string; content: string; similarity: number }[];
  return rows;
}

/**
 * Condense the last 2 user turns from history + currentMessage into a single
 * query string for embedding. This gives retrieval context about the conversation
 * without ballooning the embedding input.
 */
export function condenseHistoryForRetrieval(
  history: { role: 'user' | 'assistant'; content: string }[],
  currentMessage: string
): string {
  const lastTwoUserTurns = history
    .filter(t => t.role === 'user')
    .slice(-2)
    .map(t => t.content);
  return [...lastTwoUserTurns, currentMessage].join('\n');
}

/**
 * Drop the oldest turns from history until the total character count is within
 * maxChars. Newest turns are kept. Chronological order is preserved in result.
 */
export function truncateHistory(
  history: { role: 'user' | 'assistant'; content: string }[],
  maxChars = 6000
): { role: 'user' | 'assistant'; content: string }[] {
  let total = 0;
  const kept: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    total += history[i].content.length;
    if (total > maxChars) break;
    kept.unshift(history[i]);
  }
  return kept;
}

/**
 * Deduplicate retrieved chunks by docId, keeping the highest-similarity chunk
 * per document. Returns results sorted descending by similarity.
 */
export function deduplicateSources(
  chunks: RetrievedChunk[]
): { docId: string; docTitle: string; similarity: number }[] {
  const map = chunks.reduce<Record<string, { docId: string; docTitle: string; similarity: number }>>(
    (acc, chunk) => {
      const prev = acc[chunk.docId];
      if (!prev || chunk.similarity > prev.similarity) {
        acc[chunk.docId] = { docId: chunk.docId, docTitle: chunk.docTitle, similarity: chunk.similarity };
      }
      return acc;
    },
    {}
  );
  return Object.values(map).sort((a, b) => b.similarity - a.similarity);
}
