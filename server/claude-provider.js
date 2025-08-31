import { claudeCode } from 'ai-sdk-provider-claude-code';
import fs from 'fs';

/**
 * Configure Claude provider with vault-specific settings
 */
function createClaudeProvider() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault';
  const claudeUser = process.env.CLAUDE_USER || 'claude';
  
  console.log(`🏛️ Configuring Claude provider with vault path: ${vaultPath}`);
  
  // Check if vault is properly mounted (should contain .git or CLAUDE.md)
  const isVaultMounted = fs.existsSync(vaultPath) && (
    fs.existsSync(`${vaultPath}/.git`) || 
    fs.existsSync(`${vaultPath}/CLAUDE.md`)
  );
  
  console.log(`📁 Vault mounted: ${isVaultMounted}, using working directory: ${isVaultMounted ? vaultPath : 'FAILED'}`);
  
  if (!isVaultMounted) {
    throw new Error(`❌ VAULT NOT MOUNTED: ${vaultPath} not found or missing .git/CLAUDE.md. Use SSH tunnel to production server instead of running locally.`);
  }
  
  const workingDir = vaultPath;
  
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
      'WebFetch',      // Web content fetching for URLs
      'WebSearch',     // Web search as fallback
    ]
    
    // Note: Only using allowedTools since disallowedTools conflicts and causes hangs
  });
}

export { createClaudeProvider };