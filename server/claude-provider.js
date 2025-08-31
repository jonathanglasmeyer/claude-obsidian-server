import { claudeCode } from 'ai-sdk-provider-claude-code';
import fs from 'fs';

/**
 * Configure Claude provider with vault-specific settings
 */
function createClaudeProvider() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault';
  const claudeUser = process.env.CLAUDE_USER || 'claude';
  
  console.log(`🏛️ Configuring Claude provider with vault path: ${vaultPath}`);
  
  // Use current directory as fallback if vault path doesn't exist yet
  const workingDir = fs.existsSync(vaultPath) ? vaultPath : process.cwd();
  console.log(`📁 Using working directory: ${workingDir}`);
  
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