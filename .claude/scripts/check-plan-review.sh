#!/bin/bash
# Check for plan review comments on the current PR
# Usage: ./check-plan-review.sh [--watch] [--interval SECONDS]

set -e

WATCH_MODE=false
INTERVAL=60
LAST_COMMENT_ID=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch|-w)
      WATCH_MODE=true
      shift
      ;;
    --interval|-i)
      INTERVAL="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Get current branch
BRANCH=$(git branch --show-current)

# Find PR for current branch
get_pr_number() {
  gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo ""
}

# Get plan review comments from PR
get_review_comments() {
  local pr_number=$1
  gh api "repos/{owner}/{repo}/issues/${pr_number}/comments" \
    --jq '.[] | select(.body | contains("Claude Plan Review")) | {id: .id, body: .body, created_at: .created_at, updated_at: .updated_at}'
}

# Extract review status from comment
parse_review_status() {
  local comment="$1"

  if echo "$comment" | grep -q "APPROVED"; then
    echo "APPROVED"
  elif echo "$comment" | grep -q "MAJOR CHANGES NEEDED"; then
    echo "MAJOR_CHANGES"
  elif echo "$comment" | grep -q "NEEDS REVISION"; then
    echo "NEEDS_REVISION"
  elif echo "$comment" | grep -q "Review Failed\|Usage Limit\|Authentication Error"; then
    echo "ERROR"
  else
    echo "UNKNOWN"
  fi
}

# Main check function
check_once() {
  PR_NUMBER=$(get_pr_number)

  if [ -z "$PR_NUMBER" ]; then
    echo "📋 No PR found for branch: $BRANCH"
    return 1
  fi

  echo "🔍 Checking PR #${PR_NUMBER} for plan review comments..."

  COMMENTS=$(get_review_comments "$PR_NUMBER")

  if [ -z "$COMMENTS" ]; then
    echo "⏳ No plan review comments yet"
    return 0
  fi

  # Get the latest comment
  LATEST=$(echo "$COMMENTS" | tail -1)
  COMMENT_ID=$(echo "$LATEST" | jq -r '.id')
  COMMENT_BODY=$(echo "$LATEST" | jq -r '.body')

  # Check if this is a new comment (for watch mode)
  if [ "$COMMENT_ID" = "$LAST_COMMENT_ID" ]; then
    return 0
  fi
  LAST_COMMENT_ID="$COMMENT_ID"

  STATUS=$(parse_review_status "$COMMENT_BODY")

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📝 Plan Review Found (PR #${PR_NUMBER})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  case $STATUS in
    APPROVED)
      echo "✅ Status: APPROVED"
      echo ""
      echo "Your plan has been approved! You can proceed with implementation."
      ;;
    NEEDS_REVISION)
      echo "⚠️  Status: NEEDS REVISION"
      echo ""
      echo "The plan needs some changes. See feedback below:"
      echo ""
      echo "$COMMENT_BODY" | head -100
      ;;
    MAJOR_CHANGES)
      echo "❌ Status: MAJOR CHANGES NEEDED"
      echo ""
      echo "The plan has significant issues. See feedback below:"
      echo ""
      echo "$COMMENT_BODY" | head -100
      ;;
    ERROR)
      echo "⚡ Status: REVIEW ERROR"
      echo ""
      echo "The automated review encountered an error:"
      echo ""
      echo "$COMMENT_BODY" | head -50
      ;;
    *)
      echo "📄 Review comment found:"
      echo ""
      echo "$COMMENT_BODY" | head -100
      ;;
  esac

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔗 View PR: $(gh pr view "$PR_NUMBER" --json url --jq '.url')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Return non-zero if changes needed (useful for scripting)
  if [ "$STATUS" = "NEEDS_REVISION" ] || [ "$STATUS" = "MAJOR_CHANGES" ]; then
    return 2
  fi

  return 0
}

# Watch mode - continuous polling
watch_mode() {
  echo "👀 Watching for plan review comments (every ${INTERVAL}s)..."
  echo "   Press Ctrl+C to stop"
  echo ""

  while true; do
    check_once || true
    sleep "$INTERVAL"
  done
}

# Main
if [ "$WATCH_MODE" = true ]; then
  watch_mode
else
  check_once
fi
