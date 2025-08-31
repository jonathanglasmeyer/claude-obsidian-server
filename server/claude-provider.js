import { claudeCode } from 'ai-sdk-provider-claude-code';
import fs from 'fs';

/**
 * Configure Claude provider with vault-specific settings
 */
function createClaudeProvider() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault';
  const claudeUser = process.env.CLAUDE_USER || 'claude';
  
  console.log(`🏛️ Configuring Claude provider with vault path: ${vaultPath}`);
  
  // For now, always use /app until we can debug the mounting issue
  const workingDir = '/app';
  console.log(`📁 Using working directory: ${workingDir} (vault debugging mode)`);
  
  return claudeCode('sonnet', {
    // Working directory set to vault path for file operations  
    cwd: workingDir,
    
    // Tool permissions for secure vault operations
    allowedTools: [
      'Read',          // Read existing files in vault
      'Write',         // Create new files
      'Edit',          // Modify existing files
      'MultiEdit',     // Batch file edits
      'Glob',          // File pattern matching
      'Grep',          // Content searching
      'Bash',          // Bash commands (will be restricted by system)
    ],
    
    // Explicitly deny dangerous operations
    disallowedTools: [
      'WebFetch',      // No web access for security
      'WebSearch',     // No web search
    ]
  });
}

export { createClaudeProvider };