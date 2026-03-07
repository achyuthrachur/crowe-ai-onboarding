// src/lib/embeddings.ts
// OpenAI embeddings wrapper using text-embedding-3-small (1536 dimensions)
// Single-text variant — batch variant for ingest is in scripts/ingest.ts (Phase 3)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
