#!/bin/bash
# Hook: Suggest code review after significant changes
# Trigger: PostToolUse on Edit/Write/MultiEdit
# Purpose: Remind to run code-reviewer agent after substantial edits

# Read the tool result from stdin
INPUT=$(cat)

# Get session tracking file
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
TRACKER_FILE="/tmp/claude-edit-tracker-${SESSION_ID}.txt"

# Initialize or read current count
if [ -f "$TRACKER_FILE" ]; then
    EDIT_COUNT=$(cat "$TRACKER_FILE")
else
    EDIT_COUNT=0
fi

# Increment counter
EDIT_COUNT=$((EDIT_COUNT + 1))
echo "$EDIT_COUNT" > "$TRACKER_FILE"

# Check if this is a security-sensitive file
FILE_PATH="${CLAUDE_FILE_PATH:-}"
IS_SECURITY_SENSITIVE=false

if [[ "$FILE_PATH" == *"auth"* ]] || \
   [[ "$FILE_PATH" == *"Auth"* ]] || \
   [[ "$FILE_PATH" == *"login"* ]] || \
   [[ "$FILE_PATH" == *"token"* ]] || \
   [[ "$FILE_PATH" == *"password"* ]] || \
   [[ "$FILE_PATH" == *"session"* ]] || \
   [[ "$FILE_PATH" == *"csrf"* ]] || \
   [[ "$FILE_PATH" == *"security"* ]] || \
   [[ "$FILE_PATH" == *"crypto"* ]]; then
    IS_SECURITY_SENSITIVE=true
fi

# Output the original input (pass-through)
echo "$INPUT"

# Suggest review based on conditions
if [ "$IS_SECURITY_SENSITIVE" = true ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "🔒 SECURITY-SENSITIVE FILE MODIFIED" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "File: $FILE_PATH" >&2
    echo "" >&2
    echo "→ Consider running code-reviewer agent" >&2
    echo "  for security-focused review" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
elif [ "$EDIT_COUNT" -eq 10 ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "📝 CODE REVIEW CHECKPOINT" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "You've made $EDIT_COUNT edits this session." >&2
    echo "" >&2
    echo "→ Consider running code-reviewer agent" >&2
    echo "  to catch issues early" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
elif [ "$EDIT_COUNT" -eq 20 ] || [ "$EDIT_COUNT" -eq 30 ]; then
    echo "" >&2
    echo "💡 Reminder: $EDIT_COUNT edits made. Consider a code review." >&2
fi

exit 0
