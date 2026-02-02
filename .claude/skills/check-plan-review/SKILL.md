---
name: check-plan-review
description: Check for plan review feedback from CI on the current PR
user_invocable: true
triggers:
  - keywords: ['check plan review', 'plan feedback', 'pr review status']
---

# Check Plan Review Skill

Check for automated plan review feedback from the GitHub Actions CI agent.

## What This Skill Does

1. Finds the PR associated with the current branch
2. Fetches comments looking for "Claude Plan Review" bot comments
3. Parses the review status (APPROVED / NEEDS REVISION / MAJOR CHANGES NEEDED)
4. Presents the feedback and suggests next actions

## Instructions

When the user invokes this skill:

1. **Run the check script:**

   ```bash
   bash .claude/scripts/check-plan-review.sh
   ```

2. **Based on the result, take action:**
   - **APPROVED**: Congratulate and offer to start implementation
   - **NEEDS REVISION**: Summarize the concerns and offer to update the plan
   - **MAJOR CHANGES NEEDED**: Explain the issues and help redesign the plan
   - **ERROR**: Explain the CI error and suggest manual review
   - **No PR/No comments**: Explain the PR hasn't been reviewed yet

3. **If changes are needed**, offer to:
   - Read the current plan file
   - Address each concern from the review
   - Update the plan and push changes
   - The CI will automatically re-review when pushed

## Watch Mode

To continuously monitor for feedback in the background:

```bash
bash .claude/scripts/check-plan-review.sh --watch --interval 60
```

This runs in the background and checks every 60 seconds.
