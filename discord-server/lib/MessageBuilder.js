/**
 * MessageBuilder - Builds structured messages for Claude Agent SDK
 * Supports text, image, and PDF content from Discord messages
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Supported image MIME types for Claude vision
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Supported document MIME types for text extraction
const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
];

/**
 * Extract image attachments from Discord message
 * @param {Discord.Message} message - Discord message object
 * @returns {Array} Array of image attachment info
 */
export function extractImageAttachments(message) {
  const images = [];

  if (!message.attachments || message.attachments.size === 0) {
    return images;
  }

  for (const attachment of message.attachments.values()) {
    // Check if it's a supported image type
    if (attachment.contentType && SUPPORTED_IMAGE_TYPES.includes(attachment.contentType)) {
      images.push({
        url: attachment.url,
        contentType: attachment.contentType,
        name: attachment.name,
        size: attachment.size
      });
    }
  }

  return images;
}

/**
 * Build content array for Claude API (text + images)
 * @param {string} text - Text content
 * @param {Array} images - Array of image objects from extractImageAttachments
 * @returns {Array} Content array for Claude API
 */
export function buildContentArray(text, images = []) {
  const content = [];

  // Add text content if present
  if (text && text.trim()) {
    content.push({
      type: 'text',
      text: text
    });
  }

  // Add image content
  for (const image of images) {
    content.push({
      type: 'image',
      source: {
        type: 'url',
        url: image.url
      }
    });
  }

  // If no content at all, add empty text
  if (content.length === 0) {
    content.push({
      type: 'text',
      text: ''
    });
  }

  return content;
}

/**
 * Create an async iterable that yields a single SDKUserMessage
 * This is required by the Claude Agent SDK for multi-modal messages
 * @param {Array} content - Content array from buildContentArray
 * @param {string} sessionId - Session ID (required for SDKUserMessage)
 * @returns {AsyncIterable<SDKUserMessage>}
 */
export async function* createMessageIterable(content, sessionId = '') {
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: content
    },
    parent_tool_use_id: null,
    session_id: sessionId
  };
}

/**
 * Extract text from document using markitdown
 * @param {string} url - Discord attachment URL
 * @param {string} filename - Document filename
 * @returns {Promise<string>} Extracted markdown text
 */
async function extractDocumentText(url, filename) {
  console.log(`📄 Downloading ${filename}...`);

  // Download document to temp
  const response = await fetch(url);
  const buffer = await Buffer.from(await response.arrayBuffer());

  const tempPath = join(tmpdir(), `discord-${Date.now()}-${filename}`);
  await writeFile(tempPath, buffer);

  try {
    console.log(`📝 Extracting text from ${filename} using markitdown...`);
    const { stdout } = await execAsync(`markitdown "${tempPath}"`);

    // Check if output is minimal (scanned PDF?)
    if (stdout.trim().length < 50) {
      console.log(`⚠️  Minimal text extracted from ${filename}, might be a scan - trying OCR...`);

      try {
        // Try OCR for scanned PDFs (German language)
        const ocrPath = join(tmpdir(), `discord-ocr-${Date.now()}-${filename}`);
        await execAsync(`ocrmypdf --language deu "${tempPath}" "${ocrPath}"`);

        // Extract text from OCR'd PDF
        const { stdout: ocrText } = await execAsync(`markitdown "${ocrPath}"`);
        await unlink(ocrPath).catch(() => {});

        console.log(`✅ OCR extracted ${ocrText.length} characters from ${filename}`);
        return ocrText;
      } catch (ocrError) {
        console.error(`❌ OCR failed for ${filename}:`, ocrError.message);
        return stdout; // Return original minimal text
      }
    } else {
      console.log(`✅ Extracted ${stdout.length} characters from ${filename}`);
    }

    return stdout;
  } catch (error) {
    console.error(`❌ Failed to extract text from ${filename}:`, error.message);
    return `[Failed to extract text from ${filename}: ${error.message}]`;
  } finally {
    await unlink(tempPath).catch(() => {}); // Ignore cleanup errors
  }
}

/**
 * Extract document attachments from Discord message
 * @param {Discord.Message} message - Discord message object
 * @returns {Promise<Array>} Array of extracted document info with text
 */
async function extractDocumentAttachments(message) {
  const documents = [];

  if (!message.attachments || message.attachments.size === 0) {
    return documents;
  }

  for (const attachment of message.attachments.values()) {
    // Check if it's a supported document type
    if (attachment.contentType && SUPPORTED_DOCUMENT_TYPES.includes(attachment.contentType)) {
      const text = await extractDocumentText(attachment.url, attachment.name);
      documents.push({
        url: attachment.url,
        contentType: attachment.contentType,
        name: attachment.name,
        size: attachment.size,
        text: text
      });
    }
  }

  return documents;
}

/**
 * Check if message has any images
 * @param {Discord.Message} message - Discord message object
 * @returns {boolean}
 */
export function hasImages(message) {
  return extractImageAttachments(message).length > 0;
}

/**
 * Build structured prompt from Discord message
 * Supports text, images, and documents (PDFs, DOCX, XLSX, PPTX)
 * @param {Discord.Message} message - Discord message object
 * @returns {Promise<{ text: string, images: Array, documents: Array, hasImages: boolean, hasDocuments: boolean, content: Array }>}
 */
export async function buildStructuredPrompt(message) {
  const text = message.content || '';
  const images = extractImageAttachments(message);
  const documents = await extractDocumentAttachments(message);

  // Build combined text content
  const textParts = [text];

  if (documents.length > 0) {
    textParts.push('\n\n[Attached Documents:]');
    for (const doc of documents) {
      textParts.push(`\n--- ${doc.name} ---`);
      textParts.push(doc.text);
      textParts.push('');
    }
  }

  const fullText = textParts.join('\n');
  const content = buildContentArray(fullText, images);

  return {
    text: fullText,
    images,
    documents,
    hasImages: images.length > 0,
    hasDocuments: documents.length > 0,
    content
  };
}

export default {
  extractImageAttachments,
  buildContentArray,
  createMessageIterable,
  hasImages,
  buildStructuredPrompt
};
