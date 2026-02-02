#!/bin/bash
# End the planning phase for current PR
# Stops watcher, shows final status, offers next steps

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH=$(git branch --show-current)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏁 Ending Plan Phase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop watcher if running
if [ -f "/tmp/plan-review-watcher.pid" ]; then
  echo "⏹️  Stopping plan review watcher..."
  "$SCRIPT_DIR/watch-plan-review.sh" stop 2>/dev/null || true
  echo ""
fi

# Get final review status
echo "📋 Final Review Status:"
"$SCRIPT_DIR/check-plan-review.sh" 2>/dev/null || true
echo ""

# Show summary
PR_NUMBER=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null || echo "")

if [ -n "$PR_NUMBER" ]; then
  PR_URL=$(gh pr view "$PR_NUMBER" --json url --jq '.url')
  PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq '.state')

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 PR Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   Branch: $BRANCH"
  echo "   PR: #$PR_NUMBER ($PR_STATE)"
  echo "   URL: $PR_URL"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Planning phase ended"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  • If approved: Start implementation"
echo "  • If changes needed: Update plan and push"
echo "  • To restart watcher: .claude/scripts/watch-plan-review.sh start"
echo ""
