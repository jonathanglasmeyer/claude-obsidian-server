#!/usr/bin/env python3
import json
import sys
import re

try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

tool_name = input_data.get("tool_name", "")
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

if tool_name != "Bash":
    sys.exit(0)

# Block development server commands that should be run by user
blocked_patterns = [
    r"\bnpm\s+run\s+dev\b",
    r"\bnpm\s+start\b",
    r"\byarn\s+dev\b",
    r"\byarn\s+start\b",
    r"\bbun\s+.*--watch\b",
    r"\bnpx\s+.*--watch\b",
    r"\ndev\s*$",  # Just "dev" command
]

for pattern in blocked_patterns:
    if re.search(pattern, command, re.IGNORECASE):
        # Block with explanation
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"⚠️ Development server commands must be run by user, not Claude.\n\nUser should run: `{command.strip()}`\n\nClaude will monitor via log files for debugging."
            }
        }
        print(json.dumps(output))
        sys.exit(0)

# Allow other commands
sys.exit(0)