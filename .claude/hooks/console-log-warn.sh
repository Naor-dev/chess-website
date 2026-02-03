#!/bin/bash
# PostToolUse hook: Warns about console.log statements before commits
# Triggers after git commit commands to remind about debug statements

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only check on git commit commands
if ! echo "$COMMAND" | grep -qE "git commit"; then
    exit 0
fi

# Check for console.log in staged files
STAGED_FILES=$(cd "$CLAUDE_PROJECT_DIR" && git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$')

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

# Search for console.log in staged changes
CONSOLE_LOGS=$(cd "$CLAUDE_PROJECT_DIR" && git diff --cached -U0 2>/dev/null | grep -E '^\+.*console\.(log|debug|info|warn|error)' | grep -v '^\+\+\+')

if [ -n "$CONSOLE_LOGS" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  CONSOLE STATEMENTS DETECTED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Found console statements in committed code:"
    echo "$CONSOLE_LOGS" | head -5
    echo ""
    echo "Consider removing before pushing to production."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

exit 0
