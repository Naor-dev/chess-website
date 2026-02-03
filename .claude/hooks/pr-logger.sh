#!/bin/bash
# PostToolUse hook: Logs PR URL after creation
# Triggers after Bash commands that create PRs

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
STDOUT=$(echo "$INPUT" | jq -r '.tool_result.stdout // ""')

# Check if this was a PR creation command
if echo "$COMMAND" | grep -qE "gh pr create"; then
    # Extract PR URL from output (gh pr create outputs the URL)
    PR_URL=$(echo "$STDOUT" | grep -oE "https://github.com/[^[:space:]]+" | head -1)

    if [ -n "$PR_URL" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 PR CREATED SUCCESSFULLY"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📎 URL: $PR_URL"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    fi
fi

exit 0
