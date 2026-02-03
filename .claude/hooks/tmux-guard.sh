#!/bin/bash
# Hook: Block dev servers outside tmux
# Trigger: PreToolUse on Bash with dev commands
# Purpose: Ensures you can access logs via tmux

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Check if running dev server command
if echo "$COMMAND" | grep -qE "(npm run dev|pnpm( run)? dev|yarn dev|bun run dev)"; then
    if [ -z "$TMUX" ]; then
        echo "" >&2
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        echo "🚫 BLOCKED: Dev server must run in tmux" >&2
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        echo "" >&2
        echo "Use: tmux new-session -d -s dev \"pnpm dev\"" >&2
        echo "Then: tmux attach -t dev" >&2
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
        exit 1
    fi
fi

echo "$INPUT"
exit 0
