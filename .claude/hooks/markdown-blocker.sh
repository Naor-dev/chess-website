#!/bin/bash
# Hook: Block creation of unnecessary markdown files
# Trigger: PreToolUse on Write with .md/.txt files
# Purpose: Keeps documentation consolidated

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Check if writing a markdown or text file
if echo "$FILE_PATH" | grep -qE '\.(md|txt)$'; then
    # Allow specific documentation files
    if echo "$FILE_PATH" | grep -qE '(README|CLAUDE|AGENTS|CONTRIBUTING|CHANGELOG|LICENSE)\.md$'; then
        echo "$INPUT"
        exit 0
    fi

    # Allow files in specific directories
    if echo "$FILE_PATH" | grep -qE '(dev/|docs/|\.claude/)'; then
        echo "$INPUT"
        exit 0
    fi

    # Block other markdown files
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "🚫 BLOCKED: Unnecessary documentation file" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "File: $FILE_PATH" >&2
    echo "" >&2
    echo "Use README.md or docs/ folder instead." >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    exit 1
fi

echo "$INPUT"
exit 0
