#!/bin/bash
# Hook: Suggest manual compaction at logical intervals
# Trigger: PreToolUse on Edit/Write
# Purpose: Reminds to compact context when working on many files

INPUT=$(cat)

# Get session tracking file
SESSION_ID="${CLAUDE_SESSION_ID:-default}"
TRACKER_FILE="/tmp/claude-compact-tracker-${SESSION_ID}.txt"

# Initialize or read current count
if [ -f "$TRACKER_FILE" ]; then
    EDIT_COUNT=$(cat "$TRACKER_FILE")
else
    EDIT_COUNT=0
fi

# Increment counter
EDIT_COUNT=$((EDIT_COUNT + 1))
echo "$EDIT_COUNT" > "$TRACKER_FILE"

# Output the original input (pass-through)
echo "$INPUT"

# Suggest compaction at intervals
if [ "$EDIT_COUNT" -eq 25 ]; then
    echo "" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "💡 COMPACTION SUGGESTION" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "" >&2
    echo "You've made $EDIT_COUNT edits this session." >&2
    echo "" >&2
    echo "Consider running /compact if:" >&2
    echo "  • You've completed a logical unit of work" >&2
    echo "  • Context is getting large" >&2
    echo "  • Switching to a new task" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
elif [ "$EDIT_COUNT" -eq 50 ] || [ "$EDIT_COUNT" -eq 75 ]; then
    echo "" >&2
    echo "💡 $EDIT_COUNT edits. Consider /compact before context fills up." >&2
fi

exit 0
