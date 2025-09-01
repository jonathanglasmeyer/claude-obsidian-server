// Extract delta content from AI SDK streaming chunks
export function extractDeltaFromChunk(chunk) {
  if (chunk.includes('"type":"text-delta"')) {
    // Fixed regex that handles escaped quotes properly
    const match = chunk.match(/"delta":"((?:[^"\\]|\\.)*)"/);
    if (match) {
      // JSON unescape the extracted text
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }
  return null;
}

// Old buggy version for comparison
export function extractDeltaFromChunkOld(chunk) {
  if (chunk.includes('"type":"text-delta"')) {
    // Buggy regex that stops at first quote
    const match = chunk.match(/"delta":"([^"]+)"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}