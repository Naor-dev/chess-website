#!/bin/bash
# PostToolUse hook: Runs build analysis in background after significant edits
# Helps catch build errors early without blocking the workflow

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""')

# Only trigger for TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
    exit 0
fi

# Determine which app was edited
APP_DIR=""
if [[ "$FILE_PATH" == *"/apps/backend/"* ]]; then
    APP_DIR="apps/backend"
elif [[ "$FILE_PATH" == *"/apps/frontend/"* ]]; then
    APP_DIR="apps/frontend"
fi

if [ -z "$APP_DIR" ]; then
    exit 0
fi

# Track file to avoid duplicate builds
TRACKER_FILE="/tmp/claude-async-build-tracker-$$"
LAST_BUILD_FILE="/tmp/claude-last-build-${APP_DIR//\//-}"

# Check if we recently triggered a build (within 30 seconds)
if [ -f "$LAST_BUILD_FILE" ]; then
    LAST_BUILD=$(cat "$LAST_BUILD_FILE")
    NOW=$(date +%s)
    if [ $((NOW - LAST_BUILD)) -lt 30 ]; then
        exit 0
    fi
fi

# Record this build time
date +%s > "$LAST_BUILD_FILE"

# Run tsc in background (no emit, just type check)
(
    cd "$CLAUDE_PROJECT_DIR/$APP_DIR" 2>/dev/null || exit 0
    npx tsc --noEmit 2>&1 | head -20 > "/tmp/claude-build-result-${APP_DIR//\//-}.log" &
) &

exit 0
