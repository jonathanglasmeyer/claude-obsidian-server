export class ResponseFormatter {
  constructor() {
    this.maxLength = 1900; // Discord limit minus space for part headers
    this.codeBlockPattern = /```[\s\S]*?```/g;
    this.rateLimitDelay = 1000; // 1 second between messages
  }

  /**
   * Split a long response into Discord-safe chunks
   * Respects code blocks and ensures proper formatting
   */
  chunkResponse(text) {
    if (text.length <= this.maxLength) {
      return [text];
    }

    const chunks = [];
    let currentChunk = '';

    // Find all code blocks first
    const codeBlocks = [...text.matchAll(this.codeBlockPattern)];
    let lastIndex = 0;

    for (const codeBlock of codeBlocks) {
      const beforeCode = text.slice(lastIndex, codeBlock.index);
      const codeContent = codeBlock[0];

      // Add text before code block
      if (beforeCode.trim()) {
        const beforeChunks = this._splitText(beforeCode, this.maxLength - currentChunk.length);

        for (let i = 0; i < beforeChunks.length; i++) {
          if (i === 0 && currentChunk.length + beforeChunks[i].length <= this.maxLength) {
            currentChunk += beforeChunks[i];
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = beforeChunks[i];
          }
        }
      }

      // Handle code block
      if (currentChunk.length + codeContent.length <= this.maxLength) {
        currentChunk += codeContent;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // If code block is too long, split it carefully
        if (codeContent.length > this.maxLength) {
          const codeChunks = this._splitCodeBlock(codeContent);
          chunks.push(...codeChunks);
        } else {
          currentChunk = codeContent;
        }
      }

      lastIndex = codeBlock.index + codeContent.length;
    }

    // Add remaining text after last code block
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      const remainingChunks = this._splitText(remaining, this.maxLength - currentChunk.length);

      for (let i = 0; i < remainingChunks.length; i++) {
        if (i === 0 && currentChunk.length + remainingChunks[i].length <= this.maxLength) {
          currentChunk += remainingChunks[i];
        } else {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = remainingChunks[i];
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Split regular text at natural breakpoints
   */
  _splitText(text, maxLength) {
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let current = '';

    // Split by paragraphs first
    const paragraphs = text.split('\n\n');

    for (const paragraph of paragraphs) {
      if (current.length + paragraph.length + 2 <= maxLength) {
        current += (current ? '\n\n' : '') + paragraph;
      } else {
        if (current) chunks.push(current);

        // If paragraph is too long, split by sentences
        if (paragraph.length > maxLength) {
          const sentenceChunks = this._splitBySentences(paragraph, maxLength);
          chunks.push(...sentenceChunks);
          current = '';
        } else {
          current = paragraph;
        }
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Split by sentences when paragraphs are too long
   */
  _splitBySentences(text, maxLength) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length + 1 <= maxLength) {
        current += (current ? ' ' : '') + sentence;
      } else {
        if (current) chunks.push(current);

        // If single sentence is too long, force split
        if (sentence.length > maxLength) {
          const forcedChunks = this._forceSplit(sentence, maxLength);
          chunks.push(...forcedChunks);
          current = '';
        } else {
          current = sentence;
        }
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Split code blocks while preserving syntax
   */
  _splitCodeBlock(codeBlock) {
    const lines = codeBlock.split('\n');
    const language = lines[0]; // ```python, ```js, etc.
    const codeLines = lines.slice(1, -1); // Remove ``` markers
    const chunks = [];

    let currentChunk = language + '\n';
    const maxCodeLength = this.maxLength - 8; // Leave room for ``` markers

    for (const line of codeLines) {
      if (currentChunk.length + line.length + 5 <= maxCodeLength) { // +5 for \n```
        currentChunk += line + '\n';
      } else {
        chunks.push(currentChunk + '```');
        currentChunk = language + '\n' + line + '\n';
      }
    }

    if (currentChunk !== language + '\n') {
      chunks.push(currentChunk + '```');
    }

    return chunks;
  }

  /**
   * Force split when no natural breakpoints exist
   */
  _forceSplit(text, maxLength) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength - 10) {
      chunks.push(text.slice(i, i + maxLength - 10) + '...');
    }
    return chunks;
  }

  /**
   * Send multiple chunks with rate limiting
   */
  async sendChunkedResponse(sendFunction, chunks) {
    const messages = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLast = i === chunks.length - 1;

      // Clean content - just send the chunks as-is
      const content = chunk;

      try {
        const message = await sendFunction(content);
        messages.push(message);

        // Rate limiting: wait between messages (except for last one)
        if (!isLast) {
          await this._sleep(this.rateLimitDelay);
        }
      } catch (error) {
        console.error(`❌ Failed to send chunk ${i + 1}:`, error);
        throw error;
      }
    }

    return messages;
  }

  /**
   * Sleep utility for rate limiting
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get chunking stats for debugging
   */
  getChunkingStats(originalText, chunks) {
    return {
      originalLength: originalText.length,
      chunkCount: chunks.length,
      chunkLengths: chunks.map(c => c.length),
      maxChunkLength: Math.max(...chunks.map(c => c.length)),
      totalChunkedLength: chunks.reduce((sum, c) => sum + c.length, 0)
    };
  }
}