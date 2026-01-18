#!/bin/bash
# Post-tool-use hook that tracks when Playwright browser tools are used
# Creates a marker file so the push guard knows tests were run

# Read tool information from stdin
tool_info=$(cat)

# Extract relevant data
tool_name=$(echo "$tool_info" | jq -r '.tool_name // empty')
session_id=$(echo "$tool_info" | jq -r '.session_id // empty')

# Check if this is a Playwright MCP tool (browser navigation, clicks, snapshots, etc.)
if [[ ! "$tool_name" =~ ^mcp__.*playwright.*browser_(navigate|click|snapshot|take_screenshot|fill_form|type|drag) ]]; then
    exit 0
fi

# Create cache directory
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/${session_id:-default}"
mkdir -p "$cache_dir"

# Create marker file to indicate Playwright tests were run
echo "$(date -Iseconds):$tool_name" >> "$cache_dir/playwright-tested.marker"

exit 0
