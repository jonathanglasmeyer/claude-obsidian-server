import {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} from 'discord.js';

export class ProgressReporter {
  constructor(channel) {
    this.channel = channel;
    this.typingInterval = null;
    this.startTime = null;
    this.toolCalls = [];
    this.lastUpdate = 0;
    this.updateThrottle = 1000; // 1s for live updates
  }

  /**
   * Start progress tracking with typing indicator
   */
  async start() {
    this.startTime = Date.now();
    this.toolCalls = [];

    // Start typing indicator
    await this.channel.sendTyping();

    // Renew typing every 9 seconds
    this.typingInterval = setInterval(async () => {
      try {
        await this.channel.sendTyping();
      } catch (error) {
        console.warn('Failed to send typing indicator:', error.message);
      }
    }, 9000);
  }

  /**
   * Stop progress tracking and clean up
   */
  stop() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }
  }

  /**
   * Report tool usage from Claude stream
   */
  async reportToolUse(toolName, toolInput) {
    const now = Date.now();

    // Always log the tool call
    const description = this._formatToolCall(toolName, toolInput);
    this.toolCalls.push({
      tool: toolName,
      description: description,
      timestamp: now,
      input: toolInput
    });

    // Throttle intermediate updates but show all tools
    if (now - this.lastUpdate < this.updateThrottle) {
      return;
    }

    // Send minimal live tool update using Components v2
    try {
      // Remove duplicate tool name from description if present
      const cleanDescription = description.startsWith(`${toolName}:`)
        ? description.slice(toolName.length + 2) // Remove "ToolName: "
        : description;

      const toolContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          textDisplay => textDisplay.setContent(`**${toolName}**: \`${cleanDescription}\``)
        );

      await this.channel.send({
        components: [toolContainer],
        flags: MessageFlags.IsComponentsV2
      });

      this.lastUpdate = now;

      // Continue typing after intermediate message
      await this.channel.sendTyping();
    } catch (error) {
      console.warn('Failed to send progress update:', error.message);
    }
  }

  /**
   * Create final summary embed
   */
  createSummary(fullResponse, usage, duration) {
    const totalDuration = this.startTime ? Date.now() - this.startTime : duration;

    // Create tool summary
    const toolSummary = this._createToolSummary();

    const embed = {
      title: '✅ Processing Complete',
      description: fullResponse.slice(0, 4000), // Discord limit
      color: 0x00FF00,
      timestamp: new Date().toISOString(),
      fields: []
    };

    // Add timing information
    if (totalDuration) {
      embed.fields.push({
        name: '⏱️ Duration',
        value: this._formatDuration(totalDuration),
        inline: true
      });
    }

    // Add token information
    if (usage) {
      embed.fields.push({
        name: '🔢 Tokens',
        value: this._formatTokenUsage(usage),
        inline: true
      });
    }

    // Add tool usage summary
    if (toolSummary) {
      embed.fields.push({
        name: '🛠️ Tools Used',
        value: toolSummary,
        inline: false
      });
    }

    return embed;
  }

  /**
   * Format tool calls - simple and direct
   */
  _formatToolCall(toolName, toolInput) {
    // Simple format: Tool: key info
    switch (toolName) {
      case 'Read':
        const readFile = this._extractFileName(toolInput?.file_path);
        return `Read: ${readFile}`;

      case 'Write':
        const writeFile = this._extractFileName(toolInput?.file_path);
        const writeSize = toolInput?.content?.length || 0;
        return `Write: ${writeFile} (${writeSize} chars)`;

      case 'Edit':
      case 'MultiEdit':
        const editFile = this._extractFileName(toolInput?.file_path);
        const editCount = toolInput?.edits?.length || 1;
        return `${toolName}: ${editFile}${editCount > 1 ? ` (${editCount} changes)` : ''}`;

      case 'Glob':
        return `Glob: ${toolInput?.pattern || 'files'}`;

      case 'Grep':
        return `Grep: "${toolInput?.pattern || 'search'}"`;

      case 'Bash':
        return `Bash: ${toolInput?.command || 'command'}`;

      case 'WebFetch':
        const domain = this._extractDomain(toolInput?.url);
        return `WebFetch: ${domain}`;

      case 'WebSearch':
        return `WebSearch: "${toolInput?.query || 'search'}"`;

      default:
        // For any unknown tool, show tool name + basic info
        const params = this._formatToolParams(toolInput);
        return `${toolName}${params ? `: ${params}` : ''}`;
    }
  }

  /**
   * Format tool parameters for unknown tools
   */
  _formatToolParams(toolInput) {
    if (!toolInput || typeof toolInput !== 'object') return '';

    // Pick the most relevant parameter
    const keys = Object.keys(toolInput);
    if (keys.length === 0) return '';

    // Common parameter names to prioritize
    const priorities = ['file_path', 'path', 'query', 'command', 'url', 'pattern', 'content'];

    for (const priority of priorities) {
      if (toolInput[priority]) {
        const value = String(toolInput[priority]).slice(0, 30);
        return value + (String(toolInput[priority]).length > 30 ? '...' : '');
      }
    }

    // Fallback to first parameter
    const firstKey = keys[0];
    const value = String(toolInput[firstKey]).slice(0, 30);
    return `${firstKey}: ${value}${String(toolInput[firstKey]).length > 30 ? '...' : ''}`;
  }

  /**
   * Legacy method for compatibility
   */
  _parseToolCall(toolName, toolInput) {
    const toolMap = {
      'Read': {
        emoji: '🔍',
        getMessage: (input) => {
          const fileName = this._extractFileName(input.file_path);
          return `🔍 Reading ${fileName}`;
        }
      },
      'Write': {
        emoji: '📝',
        getMessage: (input) => {
          const fileName = this._extractFileName(input.file_path);
          const size = input.content?.length || 0;
          return `📝 Writing ${fileName} (${size} chars)`;
        }
      },
      'Edit': {
        emoji: '✏️',
        getMessage: (input) => {
          const fileName = this._extractFileName(input.file_path);
          return `✏️ Editing ${fileName}`;
        }
      },
      'MultiEdit': {
        emoji: '✏️',
        getMessage: (input) => {
          const fileName = this._extractFileName(input.file_path);
          const editCount = input.edits?.length || 1;
          return `✏️ Making ${editCount} edits to ${fileName}`;
        }
      },
      'Glob': {
        emoji: '🔎',
        getMessage: (input) => {
          return `🔎 Searching for ${input.pattern}`;
        }
      },
      'Grep': {
        emoji: '🔍',
        getMessage: (input) => {
          return `🔍 Searching content: "${input.pattern}"`;
        }
      },
      'Bash': {
        emoji: '⚡',
        getMessage: (input) => {
          const cmd = input.command?.split(' ')[0] || 'command';
          return `⚡ Running ${cmd}`;
        }
      },
      'WebFetch': {
        emoji: '🌐',
        getMessage: (input) => {
          const domain = this._extractDomain(input.url);
          return `🌐 Fetching ${domain}`;
        }
      },
      'WebSearch': {
        emoji: '🔍',
        getMessage: (input) => {
          return `🔍 Web search: "${input.query}"`;
        }
      }
    };

    const tool = toolMap[toolName];
    if (!tool) return null;

    try {
      const message = tool.getMessage(toolInput || {});
      return {
        description: message,
        message: message,
        emoji: tool.emoji
      };
    } catch (error) {
      console.warn('Error parsing tool call:', error);
      return {
        description: `${tool.emoji} Using ${toolName}`,
        message: `${tool.emoji} Using ${toolName}`,
        emoji: tool.emoji
      };
    }
  }

  /**
   * Create tool usage summary
   */
  _createToolSummary() {
    if (this.toolCalls.length === 0) return null;

    // Count tool usage
    const toolCounts = {};
    this.toolCalls.forEach(call => {
      const tool = call.tool;
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    });

    // Format as summary
    const summary = Object.entries(toolCounts)
      .map(([tool, count]) => {
        const emoji = this._getToolEmoji(tool);
        return count > 1 ? `${emoji} ${tool} (${count}x)` : `${emoji} ${tool}`;
      })
      .join(', ');

    return summary;
  }

  /**
   * Get emoji for tool
   */
  _getToolEmoji(toolName) {
    const emojiMap = {
      'Read': '🔍',
      'Write': '📝',
      'Edit': '✏️',
      'MultiEdit': '✏️',
      'Glob': '🔎',
      'Grep': '🔍',
      'Bash': '⚡',
      'WebFetch': '🌐',
      'WebSearch': '🔍'
    };
    return emojiMap[toolName] || '🛠️';
  }

  /**
   * Extract filename from path
   */
  _extractFileName(filePath) {
    if (!filePath) return 'file';
    const parts = filePath.split('/');
    return parts[parts.length - 1] || 'file';
  }

  /**
   * Extract domain from URL
   */
  _extractDomain(url) {
    if (!url) return 'website';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'website';
    }
  }

  /**
   * Format duration in human-readable format
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Format token usage information
   */
  _formatTokenUsage(usage) {
    if (!usage) return 'N/A';

    const parts = [];

    if (usage.inputTokens) {
      parts.push(`${usage.inputTokens} in`);
    }
    if (usage.outputTokens) {
      parts.push(`${usage.outputTokens} out`);
    }
    if (usage.totalTokens) {
      parts.push(`${usage.totalTokens} total`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'N/A';
  }

  /**
   * Get current progress statistics
   */
  getStats() {
    return {
      duration: this.startTime ? Date.now() - this.startTime : 0,
      toolCalls: this.toolCalls.length,
      tools: [...new Set(this.toolCalls.map(c => c.tool))],
      isActive: this.typingInterval !== null
    };
  }
}