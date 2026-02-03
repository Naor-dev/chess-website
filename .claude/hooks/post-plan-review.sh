#!/bin/bash
# PostToolUse hook: After ExitPlanMode, trigger plan review and git workflow
#
# Workflow:
# 1. Run plan-reviewer agent to review the created plan
# 2. Check if on correct branch (should contain "plan" and plan topic)
# 3. If not, create new branch
# 4. Push to git (no CI/CD needed)

# Get input from stdin
INPUT=$(cat)

# Extract tool name from input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .tool // empty' 2>/dev/null)

# Only trigger for ExitPlanMode
if [ "$TOOL_NAME" != "ExitPlanMode" ]; then
    exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# Output instructions for Claude
cat << 'EOF'
<plan-review-workflow>
IMPORTANT: A plan was just created. Follow this workflow:

1. **Review the Plan**
   - Use the Task tool with subagent_type="plan-reviewer" to review the plan you just created
   - Wait for the review feedback

2. **Git Branch Check**
   - Current branch: Check if it contains "plan/" prefix
   - If NOT on a plan branch, create one: `git checkout -b plan/<short-plan-description>`
   - Branch name should be descriptive (e.g., plan/telegram-notifications, plan/auth-refactor)

3. **Commit and Push**
   - Stage the plan file(s)
   - Commit with message: "plan: <brief description of the plan>"
   - Push to remote: `git push -u origin <branch-name>`

4. **Report back** to the user with:
   - Plan review summary
   - Branch name used
   - Push status

Do NOT skip the plan review step - it helps catch issues before implementation.
</plan-review-workflow>
EOF

exit 0
