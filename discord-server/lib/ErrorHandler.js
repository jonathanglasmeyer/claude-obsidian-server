export class ErrorHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
  }

  /**
   * Map errors to user-friendly messages
   */
  getUserFriendlyMessage(error) {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';

    // Discord API errors
    if (error.code === 50035) {
      return "Message too long for Discord. This shouldn't happen - please report this bug.";
    }
    if (error.code === 50013) {
      return "Bot missing permissions. Please check bot permissions in this channel.";
    }
    if (error.code === 50001) {
      return "Bot missing access to this channel. Please check bot permissions.";
    }
    if (errorString.includes('discordapierror')) {
      return "Discord connection issue. Please try again in a moment.";
    }

    // Claude Code SDK errors
    if (errorString.includes('unauthorized') || errorMessage.includes('401')) {
      return "Claude authentication expired. Please check the CLAUDE_CODE_OAUTH_TOKEN setup.";
    }
    if (errorString.includes('rate limit') || errorMessage.includes('429')) {
      return "Claude API rate limit reached. Please wait a moment before trying again.";
    }
    if (errorString.includes('timeout') || errorMessage.includes('timeout')) {
      return "Claude processing timed out. Your request might be too complex - try breaking it down.";
    }
    if (errorString.includes('network') || errorMessage.includes('enotfound')) {
      return "Network connection issue. Please check your internet connection and try again.";
    }

    // File system errors
    if (errorString.includes('enoent') || errorMessage.includes('no such file')) {
      return "Obsidian vault path not found. Please check the OBSIDIAN_VAULT_PATH setting.";
    }
    if (errorString.includes('eacces') || errorMessage.includes('permission denied')) {
      return "Permission denied accessing vault. Please check file permissions.";
    }

    // Token/context errors
    if (errorMessage.includes('context') && errorMessage.includes('limit')) {
      return "Your request is too long. Please try with a shorter message or fewer conversation history.";
    }

    // Generic errors
    if (errorMessage.includes('connection')) {
      return "Connection issue. Please try again in a moment.";
    }

    // Default fallback
    return `Processing failed: ${error.message || 'Unknown error'}. Please try again or contact support if this persists.`;
  }

  /**
   * Get error severity level
   */
  getErrorSeverity(error) {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';

    // Critical errors that need immediate attention
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return 'critical';
    }
    if (errorString.includes('enoent') || errorMessage.includes('no such file')) {
      return 'critical';
    }

    // Warning level errors (retryable)
    if (errorMessage.includes('429') || errorString.includes('rate limit')) {
      return 'warning';
    }
    if (errorString.includes('timeout') || errorString.includes('network')) {
      return 'warning';
    }
    if (errorString.includes('discordapierror')) {
      return 'warning';
    }

    // Info level (minor issues)
    if (error.code === 50035) { // Message too long
      return 'info';
    }

    return 'error';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';

    // Don't retry authentication or permission errors
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return false;
    }
    if (error.code === 50013 || error.code === 50001) { // Discord permissions
      return false;
    }
    if (errorString.includes('enoent') || errorString.includes('eacces')) {
      return false;
    }

    // Retry network and temporary issues
    if (errorString.includes('network') || errorMessage.includes('enotfound')) {
      return true;
    }
    if (errorString.includes('timeout')) {
      return true;
    }
    if (errorMessage.includes('429') || errorString.includes('rate limit')) {
      return true;
    }
    if (errorString.includes('discordapierror')) {
      return true;
    }

    // Default: don't retry unknown errors
    return false;
  }

  /**
   * Retry operation with exponential backoff
   */
  async retryOperation(operation, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    const baseDelay = options.baseDelay || this.baseDelay;
    const context = options.context || 'operation';

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 1) {
          this.logRetrySuccess(context, attempt);
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !this.isRetryable(error)) {
          this.logRetryFailure(context, attempt, maxRetries, error);
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logRetryAttempt(context, attempt, maxRetries, error, delay);

        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Log error with structured context
   */
  logError(error, context = {}) {
    const severity = this.getErrorSeverity(error);
    const isRetryable = this.isRetryable(error);
    const userMessage = this.getUserFriendlyMessage(error);

    const logData = {
      timestamp: new Date().toISOString(),
      severity,
      isRetryable,
      userMessage,
      originalError: error.message,
      errorCode: error.code,
      errorName: error.name,
      stack: error.stack,
      ...context
    };

    // Log based on severity
    if (severity === 'critical') {
      console.error('🚨 CRITICAL ERROR:', JSON.stringify(logData, null, 2));
    } else if (severity === 'warning') {
      console.warn('⚠️ WARNING:', JSON.stringify(logData, null, 2));
    } else if (severity === 'info') {
      console.info('ℹ️ INFO:', JSON.stringify(logData, null, 2));
    } else {
      console.error('❌ ERROR:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Log retry attempt
   */
  logRetryAttempt(context, attempt, maxRetries, error, delay) {
    console.warn(`🔄 Retry ${attempt}/${maxRetries} for ${context} in ${delay}ms - ${error.message}`);
  }

  /**
   * Log retry success
   */
  logRetrySuccess(context, attempt) {
    console.log(`✅ Retry succeeded for ${context} on attempt ${attempt}`);
  }

  /**
   * Log retry failure
   */
  logRetryFailure(context, attempt, maxRetries, error) {
    console.error(`💥 Retry failed for ${context} after ${attempt}/${maxRetries} attempts - ${error.message}`);
  }

  /**
   * Create error embed for Discord
   */
  createErrorEmbed(error, context = {}) {
    const userMessage = this.getUserFriendlyMessage(error);
    const severity = this.getErrorSeverity(error);
    const isRetryable = this.isRetryable(error);

    const embed = {
      title: this._getErrorTitle(severity),
      description: userMessage,
      color: this._getErrorColor(severity),
      timestamp: new Date().toISOString(),
      footer: {
        text: `Error ID: ${context.errorId || 'unknown'}`
      }
    };

    // Add retry suggestion for retryable errors
    if (isRetryable) {
      embed.fields = [{
        name: 'Suggestion',
        value: 'This is usually temporary. Try again in a moment.',
        inline: false
      }];
    }

    // Add context fields if available
    if (context.userId) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: 'User',
        value: `<@${context.userId}>`,
        inline: true
      });
    }

    return embed;
  }

  /**
   * Get error title based on severity
   */
  _getErrorTitle(severity) {
    switch (severity) {
      case 'critical': return '🚨 Critical Error';
      case 'warning': return '⚠️ Temporary Issue';
      case 'info': return 'ℹ️ Notice';
      default: return '❌ Processing Failed';
    }
  }

  /**
   * Get error color based on severity
   */
  _getErrorColor(severity) {
    switch (severity) {
      case 'critical': return 0xDC143C; // Crimson
      case 'warning': return 0xFF8C00;  // Dark orange
      case 'info': return 0x1E90FF;     // Dodger blue
      default: return 0xFF0000;         // Red
    }
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}