import {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  MessageFlags,
  SeparatorSpacingSize
} from 'discord.js';

export class ComponentsResponseFormatter {
  constructor() {
    this.maxTextLength = 4000; // Components v2 limit
    this.maxComponentsPerMessage = 40;
  }

  /**
   * Format Claude response using Components v2
   */
  async formatResponse(content, toolCalls = []) {
    try {
      const components = [];

      // Main response content
      const responseContainer = this._createResponseContainer(content);
      components.push(responseContainer);

      // Tool usage removed - handled live by ProgressReporter

      // Stats removed - keep it clean

      return {
        components: components,
        flags: MessageFlags.IsComponentsV2
      };
    } catch (error) {
      console.error('ComponentsResponseFormatter error:', error);
      // Fallback to simple text
      return { content: content };
    }
  }

  /**
   * Create main response as pure TextDisplay (like normal messages)
   */
  _createResponseContainer(content) {
    // Remove tool call descriptions from main content when using Components v2
    let cleanContent = content;

    // Remove specific tool call patterns only
    const toolNames = ['Bash', 'Glob', 'Grep', 'Read', 'Write', 'Edit', 'MultiEdit', 'WebFetch'];
    toolNames.forEach(tool => {
      const pattern = new RegExp(`^${tool}:\\s+.*$`, 'gm');
      cleanContent = cleanContent.replace(pattern, '');
    });

    cleanContent = cleanContent.replace(/^\s*$/gm, ''); // Remove empty lines
    cleanContent = cleanContent.trim();

    // Truncate if too long for single component
    const truncatedContent = cleanContent.length > 3800
      ? cleanContent.slice(0, 3800) + '\n\n*[Response truncated due to length]*'
      : cleanContent;

    return new TextDisplayBuilder()
      .setContent(truncatedContent);
  }

  /**
   * Create single tool container (no color)
   */
  _createSingleToolContainer(tool) {
    const toolText = `🔧 **${tool.tool}**\n\`${tool.description}\``;

    return new ContainerBuilder()
      .addTextDisplayComponents(
        textDisplay => textDisplay.setContent(toolText)
      );
  }

  /**
   * Create stats container (no color)
   */
  _createStatsContainer(stats) {
    const { duration, tokens, toolCount } = stats;

    const statsText = [
      duration ? `⏱️ **Duration**: ${this._formatDuration(duration)}` : '',
      tokens ? `🧠 **Tokens**: ${tokens.input || 0} → ${tokens.output || 0}` : '',
      toolCount ? `🔧 **Tools**: ${toolCount}` : ''
    ].filter(Boolean).join('\n');

    return new ContainerBuilder()
      .addTextDisplayComponents(
        textDisplay => textDisplay.setContent(`📊 **Performance**\n${statsText}`)
      );
  }

  /**
   * Format tool summary
   */
  _formatToolSummary(toolCalls) {
    const toolCounts = {};
    toolCalls.forEach(tool => {
      toolCounts[tool.tool] = (toolCounts[tool.tool] || 0) + 1;
    });

    return Object.entries(toolCounts)
      .map(([tool, count]) => `${tool}(${count})`)
      .join(', ');
  }

  /**
   * Format duration display
   */
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Check if response should use components v2
   */
  shouldUseComponents(content, toolCalls = []) {
    // Use components if we have tools or content is substantial
    return toolCalls.length > 0 || content.length > 500;
  }
}