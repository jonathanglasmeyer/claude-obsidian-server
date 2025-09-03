import { claudeCode } from 'ai-sdk-provider-claude-code';
import fs from 'fs';

/**
 * Configure Claude provider with vault-specific settings
 */
function createClaudeProvider() {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || '/srv/claude-jobs/obsidian-vault';
  const claudeUser = process.env.CLAUDE_USER || 'claude';
  
  console.log(`🏛️ Configuring Claude provider with vault path: ${vaultPath}`);
  console.log(`🔍 Current process working directory: ${process.cwd()}`);
  console.log(`🔍 Process user: ${process.env.USER || process.env.USERNAME || 'unknown'}`);
  console.log(`🔍 Process UID: ${process.getuid ? process.getuid() : 'unknown'}`);
  console.log(`🔍 Process GID: ${process.getgid ? process.getgid() : 'unknown'}`);
  
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
  
  // Additional CWD verification
  console.log(`🔍 Final working directory for Claude CLI: ${workingDir}`);
  console.log(`🔍 Working directory exists: ${fs.existsSync(workingDir)}`);
  try {
    fs.accessSync(workingDir, fs.constants.R_OK);
    console.log(`🔍 Working directory readable: true`);
  } catch (err) {
    console.log(`🔍 Working directory readable: false (${err.message})`);
  }
  
  // Check for Claude CLI authentication
  const homeDir = process.env.HOME || '/home/node';
  const claudeConfigPath = `${homeDir}/.config/claude-code`;
  console.log(`🔍 Claude config directory: ${claudeConfigPath}`);
  console.log(`🔍 Claude config exists: ${fs.existsSync(claudeConfigPath)}`);
  
  if (fs.existsSync(claudeConfigPath)) {
    try {
      const configFiles = fs.readdirSync(claudeConfigPath);
      console.log(`🔍 Claude config files: ${JSON.stringify(configFiles)}`);
    } catch (err) {
      console.log(`🔍 Could not read Claude config directory: ${err.message}`);
    }
  }
  
  // Check for OAuth token
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  console.log(`🔍 CLAUDE_CODE_OAUTH_TOKEN present: ${oauthToken ? 'YES' : 'NO'}`);
  console.log(`🔍 CLAUDE_CODE_OAUTH_TOKEN length: ${oauthToken ? oauthToken.length : 0}`);
  
  // Just log authentication status but DON'T block - let's see what happens
  if (!oauthToken) {
    console.log(`⚠️ WARNING: No CLAUDE_CODE_OAUTH_TOKEN found - Claude CLI may fail with authentication errors`);
  } else if (oauthToken.length < 50) {
    console.log(`⚠️ WARNING: CLAUDE_CODE_OAUTH_TOKEN appears malformed (${oauthToken.length} chars) - may cause auth failures`);
  } else if (!oauthToken.startsWith('sk-ant-oat01-')) {
    console.log(`⚠️ WARNING: CLAUDE_CODE_OAUTH_TOKEN has unexpected format - may cause auth failures`);
  } else {
    console.log(`✅ Claude authentication token validation passed`);
  }
  
  // Check if vault directory has proper permissions for Claude CLI
  try {
    fs.accessSync(workingDir, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`✅ Vault directory permissions: readable and writable`);
  } catch (err) {
    console.log(`⚠️ WARNING: Vault directory permissions issue: ${err.message}`);
  }
  
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