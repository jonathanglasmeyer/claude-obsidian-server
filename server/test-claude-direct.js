#!/usr/bin/env node

import { spawn } from 'child_process';
import { promisify } from 'util';

async function testClaudeDirect() {
  console.log('Testing Claude Code CLI directly with authentication...');

  return new Promise((resolve, reject) => {
    const claude = spawn('/home/node/.local/bin/claude', [], {
      cwd: '/srv/claude-jobs/obsidian-vault',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claude.on('close', (code) => {
      console.log(`Claude process exited with code: ${code}`);
      if (stdout) console.log('STDOUT:', stdout);
      if (stderr) console.log('STDERR:', stderr);

      if (code === 0) {
        console.log('✅ Claude CLI authentication working');
        resolve();
      } else {
        console.log('❌ Claude CLI failed');
        reject(new Error(`Exit code ${code}`));
      }
    });

    // Send a simple prompt
    claude.stdin.write('Just say hello\n');
    claude.stdin.end();
  });
}

testClaudeDirect().catch(console.error);