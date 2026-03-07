// src/lib/retrieval.test.ts
// Unit tests for pure helper functions in retrieval.ts.
// No database or OpenAI mocking required — these functions are pure.
import { describe, it, expect } from 'vitest';
import {
  condenseHistoryForRetrieval,
  truncateHistory,
  deduplicateSources,
} from './retrieval';
import type { RetrievedChunk } from './retrieval';

// ─── condenseHistoryForRetrieval ─────────────────────────────────────────────

describe('condenseHistoryForRetrieval', () => {
  it('empty history + message returns just the message', () => {
    const result = condenseHistoryForRetrieval([], 'hello');
    expect(result).toBe('hello');
  });

  it('1 user turn + message returns both joined with newline', () => {
    const history = [{ role: 'user' as const, content: 'colors?' }];
    const result = condenseHistoryForRetrieval(history, 'typography?');
    expect(result).toBe('colors?\ntypography?');
  });

  it('3 user turns + message takes last 2 user turns', () => {
    const history = [
      { role: 'user' as const, content: 'A' },
      { role: 'user' as const, content: 'B' },
      { role: 'user' as const, content: 'C' },
    ];
    const result = condenseHistoryForRetrieval(history, 'D');
    expect(result).toBe('B\nC\nD');
  });

  it('history with assistant turns only + message returns just message', () => {
    const history = [
      { role: 'assistant' as const, content: 'response A' },
      { role: 'assistant' as const, content: 'response B' },
    ];
    const result = condenseHistoryForRetrieval(history, 'X');
    expect(result).toBe('X');
  });

  it('mixed roles: filters to user only', () => {
    const history = [
      { role: 'user' as const, content: 'A' },
      { role: 'assistant' as const, content: 'response' },
      { role: 'user' as const, content: 'B' },
    ];
    const result = condenseHistoryForRetrieval(history, 'C');
    expect(result).toBe('A\nB\nC');
  });
});

// ─── truncateHistory ──────────────────────────────────────────────────────────

describe('truncateHistory', () => {
  it('empty array returns empty array', () => {
    const result = truncateHistory([]);
    expect(result).toEqual([]);
  });

  it('all content fits within 6000 chars — full array returned unchanged', () => {
    const history = [
      { role: 'user' as const, content: 'short question' },
      { role: 'assistant' as const, content: 'short answer' },
    ];
    const result = truncateHistory(history);
    expect(result).toEqual(history);
  });

  it('array exceeding 6000 chars drops oldest turns, keeps newest', () => {
    // Each content is 1000 chars; 7 entries = 7000 chars total, exceeds 6000
    const long = 'x'.repeat(1000);
    const history = Array.from({ length: 7 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: long,
    }));
    const result = truncateHistory(history);
    // 6 entries = 6000 chars exactly, but the 7th would push total to 7000 — so 6 kept
    expect(result.length).toBe(6);
    // Newest 6 (indices 1-6)
    expect(result).toEqual(history.slice(1));
  });

  it('single turn longer than 6000 chars is dropped', () => {
    const history = [
      { role: 'user' as const, content: 'x'.repeat(6001) },
    ];
    const result = truncateHistory(history);
    expect(result).toEqual([]);
  });

  it('result maintains original chronological order', () => {
    const history = [
      { role: 'user' as const, content: 'first' },
      { role: 'assistant' as const, content: 'second' },
      { role: 'user' as const, content: 'third' },
    ];
    const result = truncateHistory(history);
    expect(result[0].content).toBe('first');
    expect(result[1].content).toBe('second');
    expect(result[2].content).toBe('third');
  });
});

// ─── deduplicateSources ───────────────────────────────────────────────────────

describe('deduplicateSources', () => {
  it('empty array returns empty array', () => {
    const result = deduplicateSources([]);
    expect(result).toEqual([]);
  });

  it('two chunks with different docIds — both returned sorted desc by similarity', () => {
    const chunks: RetrievedChunk[] = [
      { docId: 'doc-b', docTitle: 'Doc B', content: '...', similarity: 0.7 },
      { docId: 'doc-a', docTitle: 'Doc A', content: '...', similarity: 0.9 },
    ];
    const result = deduplicateSources(chunks);
    expect(result).toHaveLength(2);
    expect(result[0].docId).toBe('doc-a');
    expect(result[0].similarity).toBe(0.9);
    expect(result[1].docId).toBe('doc-b');
    expect(result[1].similarity).toBe(0.7);
  });

  it('two chunks, same docId — keeps highest similarity only', () => {
    const chunks: RetrievedChunk[] = [
      { docId: 'doc-a', docTitle: 'Doc A', content: 'chunk 1', similarity: 0.8 },
      { docId: 'doc-a', docTitle: 'Doc A', content: 'chunk 2', similarity: 0.6 },
    ];
    const result = deduplicateSources(chunks);
    expect(result).toHaveLength(1);
    expect(result[0].docId).toBe('doc-a');
    expect(result[0].similarity).toBe(0.8);
  });

  it('three chunks with two from same docId — deduplicates and sorts desc', () => {
    const chunks: RetrievedChunk[] = [
      { docId: 'doc-a', docTitle: 'Doc A', content: 'chunk 1', similarity: 0.9 },
      { docId: 'doc-b', docTitle: 'Doc B', content: 'chunk 1', similarity: 0.7 },
      { docId: 'doc-a', docTitle: 'Doc A', content: 'chunk 2', similarity: 0.5 },
    ];
    const result = deduplicateSources(chunks);
    expect(result).toHaveLength(2);
    expect(result[0].docId).toBe('doc-a');
    expect(result[0].similarity).toBe(0.9);
    expect(result[1].docId).toBe('doc-b');
    expect(result[1].similarity).toBe(0.7);
  });
});
