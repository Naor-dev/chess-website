#!/bin/bash
# Stop hook: Send Telegram notification when Claude needs user input
# Automatically reads tab title from Claude Code's sessions-index.json

# Check if Telegram credentials are set
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    exit 0
fi

# Get input from stdin (hook input JSON)
INPUT=$(cat)

# Extract session_id and stop reason from input JSON
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
STOP_REASON=$(echo "$INPUT" | jq -r '.stop_reason // .reason // "unknown"' 2>/dev/null || echo "unknown")

# Get tab title from sessions-index.json using session_id
TAB_NAME=""
if [ -n "$SESSION_ID" ] && [ -n "$CLAUDE_PROJECT_DIR" ]; then
    # Convert project path to Claude's index path format (replace / with -)
    PROJECT_PATH_ENCODED=$(echo "$CLAUDE_PROJECT_DIR" | sed 's|^/||; s|/|-|g')
    INDEX_FILE="$HOME/.claude/projects/-${PROJECT_PATH_ENCODED}/sessions-index.json"

    if [ -f "$INDEX_FILE" ]; then
        TAB_NAME=$(jq -r --arg sid "$SESSION_ID" '.entries[] | select(.sessionId == $sid) | .summary // empty' "$INDEX_FILE" 2>/dev/null)
    fi
fi

# Fallback to project name if no tab title found
if [ -z "$TAB_NAME" ]; then
    TAB_NAME=$(basename "${CLAUDE_PROJECT_DIR:-$(pwd)}")
fi

# Escape HTML entities in tab name
TAB_NAME=$(echo "$TAB_NAME" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')

# Determine emoji and status based on stop reason
case "$STOP_REASON" in
    *permission*|*Permission*)
        EMOJI="🔐"
        STATUS="Waiting for permission"
        ;;
    *question*|*Question*|*input*|*Input*)
        EMOJI="❓"
        STATUS="Asking a question"
        ;;
    *complete*|*Complete*|*done*|*Done*|*finished*|*Finished*)
        EMOJI="✅"
        STATUS="Task completed"
        ;;
    *error*|*Error*|*fail*|*Fail*)
        EMOJI="❌"
        STATUS="Encountered an error"
        ;;
    *)
        EMOJI="🤖"
        STATUS="Needs your attention"
        ;;
esac

# Build the message
MESSAGE="${EMOJI} <b>${TAB_NAME}</b>
${STATUS}"

# Send notification to Telegram (use --data-urlencode for proper encoding)
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
    --data-urlencode "text=$MESSAGE" \
    --data-urlencode "parse_mode=HTML" \
    > /dev/null 2>&1

exit 0
