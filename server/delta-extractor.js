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

