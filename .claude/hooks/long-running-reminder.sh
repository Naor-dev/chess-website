#!/bin/bash
# Hook: Remind to use tmux for long-running commands
# Trigger: PreToolUse on Bash with install/test/build commands
# Purpose: Reminds about tmux for session persistence

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Check if running long-running command
if echo "$COMMAND" | grep -qE "(npm (install|test)|pnpm (install|test)|yarn (install|test)?|bun (install|test)|docker|pytest|vitest|playwright)"; then
    if [ -z "$TMUX" ]; then
        echo "" >&2
        echo "💡 Consider running in tmux for session persistence" >&2
        echo "   tmux new -s dev  |  tmux attach -t dev" >&2
    fi
fi

echo "$INPUT"
exit 0
