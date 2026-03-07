// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { embedText } from '@/lib/embeddings';
import {
  retrieveChunks,
  condenseHistoryForRetrieval,
  truncateHistory,
  deduplicateSources,
} from '@/lib/retrieval';

// MUST be first top-level export — Vercel reads maxDuration at build time.
// Hobby plan default is 10s; embed + retrieval + GPT-4o needs up to 60s.
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: HistoryTurn[];
}

export async function POST(request: NextRequest) {
  const body: ChatRequestBody = await request.json();
  const { message, history = [] } = body;

  // Step 1: Condense history for retrieval (last 2 user turns + current message)
  const condensedQuery = condenseHistoryForRetrieval(history, message);

  // Step 2: Embed the condensed query (single OpenAI call, text-embedding-3-small)
  const queryEmbedding = await embedText(condensedQuery);

  // Step 3: Retrieve top-5 chunks via cosine similarity (threshold 0.3)
  const chunks = await retrieveChunks(queryEmbedding);

  // Step 4: Fallback — skip GPT-4o entirely when no chunks pass threshold.
  // Calling GPT-4o on empty context produces hallucinated answers.
  if (chunks.length === 0) {
    return NextResponse.json({
      reply: "I don't have information on that in the knowledge base.",
      sources: [],
    });
  }

  // Step 5: Deduplicate sources (one entry per docId, highest similarity kept)
  const sources = deduplicateSources(chunks);

  // Step 6: Truncate history to 6000-char sliding window (drop oldest first)
  const truncatedHistory = truncateHistory(history);

  // Step 7: Build GPT-4o messages — system prompt with retrieved context,
  // truncated history, then current user message
  const systemPrompt = `You are the Crowe AI Practice onboarding assistant. You help new team members
understand the tools, stack, branding standards, and workflows used on the team.

Answer questions using ONLY the context provided below. If the context doesn't
contain enough information to answer confidently, say so clearly.

When referencing specific values (colors, class names, commands), quote them
exactly as they appear in the context.

Context:
---
${chunks.map(c => c.content).join('\n\n---\n\n')}
---`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...truncatedHistory,
    { role: 'user', content: message },
  ];

  // Step 8: GPT-4o completion (stream: false, temperature: 0.2, max_tokens: 800)
  // Model is configurable via OPENAI_MODEL env var — swap models without code changes
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    messages,
    temperature: 0.2,
    max_tokens: 800,
    stream: false,
  });

  const reply = completion.choices[0].message.content ?? '';

  return NextResponse.json({ reply, sources });
}
