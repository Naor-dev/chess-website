#!/bin/bash
# Pre-tool-use hook that blocks git push if frontend files were edited
# but Playwright tests weren't run in this session

# Read tool information from stdin
tool_info=$(cat)

# Extract relevant data
tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty')
command=$(echo "$tool_info" | jq -r '.tool_input.command // empty')
session_id=$(echo "$tool_info" | jq -r '.session_id // empty')

# Only check Bash commands
if [[ "$tool_name" != "Bash" ]]; then
    exit 0
fi

# Only check git push commands
if [[ ! "$command" =~ git[[:space:]]+push ]]; then
    exit 0
fi

# Cache directory for tracking
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id:-default}"

# Check if frontend files were edited
frontend_edited=false
if [[ -f "$cache_dir/edited-files.log" ]]; then
    if grep -qE "(apps/frontend|packages/shared)" "$cache_dir/edited-files.log" 2>/dev/null; then
        frontend_edited=true
    fi
fi

# If no frontend files edited, allow push
if [[ "$frontend_edited" != "true" ]]; then
    exit 0
fi

# Check if Playwright tests were run (marker file created by browser tools)
playwright_tested=false
if [[ -f "$cache_dir/playwright-tested.marker" ]]; then
    playwright_tested=true
fi

# If frontend edited but Playwright not run, BLOCK the push
if [[ "$frontend_edited" == "true" && "$playwright_tested" != "true" ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚫 PUSH BLOCKED: Playwright UI tests required"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Frontend files were modified but no Playwright tests were run."
    echo ""
    echo "Before pushing, please:"
    echo "  1. Start dev servers: pnpm dev"
    echo "  2. Navigate to affected pages using browser_navigate"
    echo "  3. Test the new/changed functionality"
    echo "  4. Verify visual feedback works correctly"
    echo ""
    echo "Edited frontend files:"
    grep -E "(apps/frontend|packages/shared)" "$cache_dir/edited-files.log" 2>/dev/null | cut -d: -f2 | sort -u | head -10
    echo ""
    echo "To bypass (not recommended): touch $cache_dir/playwright-tested.marker"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

exit 0
