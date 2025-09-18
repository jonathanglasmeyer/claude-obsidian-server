/**
 * ThreadNamer - Smart thread naming using first words
 * Phase 2.1 of Discord Bot Implementation Plan
 */

class ThreadNamer {
  constructor() {
    this.maxLength = 100; // Discord thread name limit
    this.maxTitleLength = 90; // Leave some buffer
  }

  /**
   * Creates an immediate thread name from user message (literal)
   * @param {string} content - The original message content
   * @returns {string} Truncated user message for immediate thread creation
   */
  createImmediateThreadName(content) {
    // Clean content for immediate use
    let immediate = content
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Truncate to Discord's limit
    if (immediate.length > this.maxLength) {
      immediate = immediate.substring(0, this.maxLength - 3) + '...';
    }

    return immediate || 'New Discussion';
  }

  /**
   * Generates a clean thread title from first words
   * @param {string} content - The message content to analyze
   * @returns {string} Clean thread title
   */
  generateSmartTitle(content) {
    console.log('📝 Generating smart thread title from first words...');

    const cleanTitle = this.createFallbackTitle(content);
    console.log(`✨ Smart title generated: "${cleanTitle}"`);

    return cleanTitle;
  }

  /**
   * Creates a fallback title when Haiku generation fails
   * @param {string} content - The original message content
   * @returns {string} Simple fallback title
   */
  createFallbackTitle(content) {
    // Simple rules-based fallback
    const words = content.trim().split(/\s+/);

    if (words.length <= 8) {
      return content.replace(/\n+/g, ' ').trim();
    }

    // Take first 8 words
    const title = words.slice(0, 8).join(' ');
    return title.length > this.maxTitleLength
      ? title.substring(0, this.maxTitleLength - 3) + '...'
      : title;
  }

  /**
   * Renames a thread with the smart title (synchronous)
   * @param {Object} thread - Discord thread object
   * @param {string} content - Original message content
   * @returns {Promise<void>} Resolves when renaming is complete or fails gracefully
   */
  async renameThreadSmart(thread, content) {
    try {
      const smartTitle = this.generateSmartTitle(content);

      // Only rename if the new title is different and better
      if (smartTitle && smartTitle !== thread.name && smartTitle.length > 10) {
        await thread.setName(smartTitle);
        console.log(`🔄 Thread renamed: "${thread.name}" → "${smartTitle}"`);
      }
    } catch (error) {
      console.error('⚠️ Thread renaming failed (non-critical):', error.message);
      // Non-blocking - thread keeps its original name
    }
  }

  /**
   * Creates thread immediately (first step only)
   * @param {Object} message - Discord message object
   * @returns {Promise<Object>} Discord thread object
   */
  async createThreadImmediate(message) {
    const content = message.content;

    // Defensive check: see if thread already exists for this message
    try {
      if (message.hasThread) {
        console.log(`📝 Thread already exists for this message, fetching...`);
        // Fetch the existing thread
        const channel = message.channel;
        const threads = await channel.threads.fetchActive();
        const existingThread = threads.threads.find(thread => thread.ownerId === message.author.id);

        if (existingThread) {
          console.log(`📝 Using existing thread: "${existingThread.name}"`);
          return existingThread;
        }
      }
    } catch (error) {
      console.log(`🔍 No existing thread found, creating new one...`);
      // Continue with thread creation
    }

    // Create thread immediately with user content
    const immediateTitle = this.createImmediateThreadName(content);

    try {
      const thread = await message.startThread({
        name: immediateTitle,
        autoArchiveDuration: 1440, // 24 hours
        reason: 'Claude conversation thread'
      });

      console.log(`📝 Thread created immediately: "${immediateTitle}"`);
      return thread;
    } catch (error) {
      // Handle the specific "thread already exists" error
      if (error.code === 160004) {
        console.log(`⚠️ Thread already exists for this message (Discord API Error 160004)`);

        // Try to find the existing thread another way
        const channel = message.channel;
        try {
          const threads = await channel.threads.fetchActive();
          const existingThread = threads.threads.find(thread =>
            thread.parentId === channel.id &&
            thread.ownerId === message.author.id
          );

          if (existingThread) {
            console.log(`📝 Found and using existing thread: "${existingThread.name}"`);
            return existingThread;
          }
        } catch (fetchError) {
          console.error(`❌ Could not fetch existing thread:`, fetchError);
        }

        // Re-throw the original error if we can't find the thread
        throw error;
      }

      // Re-throw any other errors
      throw error;
    }
  }

  /**
   * Renames thread after main processing is complete (second step)
   * @param {Object} thread - Discord thread object
   * @param {string} originalContent - Original message content
   * @returns {Promise<void>} Resolves when renaming is complete
   */
  async renameThreadAfterProcessing(thread, originalContent) {
    try {
      console.log('🤖 Starting smart thread renaming after main processing...');
      await this.renameThreadSmart(thread, originalContent);
    } catch (error) {
      console.error('⚠️ Post-processing thread renaming failed:', error.message);
      // Non-critical error - thread keeps its original name
    }
  }

  /**
   * Gets timing statistics for debugging
   * @param {string} content - The message content
   * @returns {Promise<Object>} Timing and analysis results
   */
  async analyzePerformance(content) {
    const startTime = Date.now();

    const immediate = this.createImmediateThreadName(content);
    const immediateTime = Date.now() - startTime;

    const smartStartTime = Date.now();
    const smart = await this.generateSmartTitle(content);
    const smartTime = Date.now() - smartStartTime;

    return {
      immediateTitle: immediate,
      smartTitle: smart,
      immediateTimeMs: immediateTime,
      smartTimeMs: smartTime,
      contentLength: content.length
    };
  }
}

export default ThreadNamer;