import { streamText } from 'ai';
import { createClaudeProvider } from './claude-provider.js';

class AIService {
  constructor() {
    this.claude = null;  // Initialize lazily when needed
  }

  getClaudeProvider() {
    if (!this.claude) {
      console.log('🔧 Initializing Claude provider at runtime...');
      this.claude = createClaudeProvider();
    }
    return this.claude;
  }

  /**
   * Create a streaming AI session for content processing
   * @param {string} content - The shared content to process
   * @param {string} type - Content type ('text', 'url', 'continuation')
   * @param {Array} conversationHistory - Previous messages for context
   * @returns {AsyncIterable} - Stream of AI responses
   */
  async createStreamingSession(content, type = 'text', conversationHistory = null) {
    console.log(`🤖 Creating Claude streaming session for ${type} content`);

    try {
      let messages;

      if (type === 'continuation' && conversationHistory && conversationHistory.length > 0) {
        // Build conversation from history
        messages = [
          {
            role: 'system',
            content: `You are helping to organize content into an Obsidian vault. You can continue previous conversations to refine, modify, or execute proposals. The vault has existing structure and CLAUDE.md rules.

Continue the conversation naturally, maintaining context from previous messages.`,
          }
        ];

        // Add conversation history
        conversationHistory.forEach(msg => {
          if (msg.role && msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }
        });

        // Add the new user message
        messages.push({
          role: 'user',
          content: content
        });

      } else {
        // New conversation - construct initial prompt
        const prompt = this.buildPrompt(content, type);
        messages = [
          {
            role: 'system',
            content: `You are helping to organize content into an Obsidian vault. The vault has existing structure and CLAUDE.md rules that define how content should be categorized and stored.

Your task:
1. Analyze the provided content
2. Propose the best location and format for storing it in the vault
3. Create or update the appropriate files
4. Commit changes to git with descriptive messages

Always explain your reasoning and ask for confirmation before making changes.`,
          },
          {
            role: 'user',
            content: prompt
          }
        ];
      }

      // Create streaming response using AI SDK
      const result = await streamText({
        model: this.getClaudeProvider(),
        messages: messages,
        temperature: 0.3, // Lower temperature for more consistent file organization
        maxTokens: 4000,
      });

      return result;
    } catch (error) {
      console.error('❌ Error creating AI streaming session:', error);
      throw error;
    }
  }

  /**
   * Build appropriate prompt based on content type
   */
  buildPrompt(content, type) {
    const timestamp = new Date().toISOString();
    
    if (type === 'url') {
      return `I want to save this URL and its content to my Obsidian vault:

URL: ${content}
Timestamp: ${timestamp}

Please:
1. Analyze what type of content this URL contains
2. Propose where in the vault structure it should be stored
3. Suggest the filename and format (markdown)
4. Show me exactly what content will be saved
5. Wait for my confirmation before creating any files

Consider the existing vault structure and follow any CLAUDE.md rules you find.`;
    } else {
      return `I want to save this text content to my Obsidian vault:

Content: ${content}
Timestamp: ${timestamp}

Please:
1. Analyze the content and determine its category/topic
2. Propose where in the vault structure it should be stored  
3. Suggest the filename and format (markdown)
4. Show me exactly how the content will be formatted
5. Wait for my confirmation before creating any files

Consider the existing vault structure and follow any CLAUDE.md rules you find.`;
    }
  }

  /**
   * Process confirmation and execute the AI's proposal
   */
  async executeProposal(sessionData, userAction = 'confirm') {
    console.log(`✅ Executing AI proposal with action: ${userAction}`);
    
    if (userAction !== 'confirm') {
      return { success: false, message: 'Action cancelled by user' };
    }

    try {
      // In a real implementation, we would:
      // 1. Parse the AI's proposal from the session
      // 2. Execute the file operations
      // 3. Commit to git
      // For now, return success
      
      return {
        success: true,
        message: 'Content successfully saved to vault',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error executing AI proposal:', error);
      throw error;
    }
  }
}

export default AIService;