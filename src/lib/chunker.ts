// src/lib/chunker.ts
// Heading-aware markdown chunker
// Split strategy: ## and ### heading boundaries first, then \n\n if section exceeds MAX_CHUNK_CHARS
// Token estimate: 4 chars ≈ 1 token (no tiktoken dependency)

const MAX_CHUNK_CHARS = 2400;  // ~600 tokens
const MIN_CHUNK_CHARS = 400;   // ~100 tokens
const OVERLAP_CHARS = 200;     // ~50 tokens

export interface Chunk {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  content: string;
}

export function chunkMarkdown(
  markdown: string,
  docId: string,
  docTitle: string,
): Chunk[] {
  // Step 1: Split on heading boundaries (## and ###)
  // Use regex to split on lines that start with ## or ###
  // Each section retains its heading as the first line
  const headingRegex = /^(#{2,3} .+)$/m;
  const parts = markdown.split(headingRegex);

  // Reconstruct sections: even indices are content before/between headings,
  // odd indices are the headings themselves
  const sections: string[] = [];
  let currentSection = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (headingRegex.test(part)) {
      // This part is a heading — save any accumulated content, start new section
      if (currentSection.trim()) {
        sections.push(currentSection.trim());
      }
      currentSection = part;
    } else {
      currentSection += (currentSection ? '\n\n' : '') + part;
    }
  }
  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }

  // Step 2: For sections exceeding MAX_CHUNK_CHARS, split on paragraph boundaries (\n\n)
  const rawChunks: string[] = [];
  for (const section of sections) {
    if (section.length <= MAX_CHUNK_CHARS) {
      rawChunks.push(section);
    } else {
      // Split on \n\n, keeping heading prefix on first sub-chunk
      const headingMatch = section.match(/^(#{2,3} .+)\n\n?/);
      const headingPrefix = headingMatch ? headingMatch[0].trimEnd() : '';
      const bodyStart = headingPrefix ? section.slice(headingPrefix.length).trimStart() : section;
      const paragraphs = bodyStart.split(/\n\n+/);

      let currentChunk = headingPrefix;
      for (const para of paragraphs) {
        const candidate = currentChunk
          ? currentChunk + '\n\n' + para
          : para;
        if (candidate.length > MAX_CHUNK_CHARS && currentChunk) {
          rawChunks.push(currentChunk);
          // Add OVERLAP_CHARS from end of previous chunk
          const overlap = currentChunk.slice(-OVERLAP_CHARS);
          currentChunk = overlap + '\n\n' + para;
        } else {
          currentChunk = candidate;
        }
      }
      if (currentChunk.trim()) {
        rawChunks.push(currentChunk.trim());
      }
    }
  }

  // Step 3: Merge consecutive chunks under MIN_CHUNK_CHARS with next sibling
  const mergedChunks: string[] = [];
  let pending = '';
  for (const chunk of rawChunks) {
    if (pending) {
      const merged = pending + '\n\n' + chunk;
      if (merged.length <= MAX_CHUNK_CHARS) {
        pending = merged;
      } else {
        mergedChunks.push(pending);
        pending = chunk;
      }
    } else if (chunk.length < MIN_CHUNK_CHARS) {
      pending = chunk;
    } else {
      mergedChunks.push(chunk);
    }
  }
  if (pending) {
    mergedChunks.push(pending);
  }

  // Step 4: Map to Chunk objects
  return mergedChunks
    .filter(content => content.trim().length > 0)
    .map((content, chunkIndex) => ({
      docId,
      docTitle,
      chunkIndex,
      content: content.trim(),
    }));
}
