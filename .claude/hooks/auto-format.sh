#!/bin/bash
# PostToolUse hook: Auto-formats JS/TS files with Prettier after edits
# Ensures consistent code style without manual intervention

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

# Only format TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Check file exists
if [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Run Prettier silently in background
(
    cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
    npx prettier --write "$FILE_PATH" 2>/dev/null
) &

exit 0
