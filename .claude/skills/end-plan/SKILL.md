---
name: end-plan
description: End the planning phase - stops the plan review watcher and shows final status
user_invocable: true
triggers:
  - keywords: ['end plan', 'finish planning', 'done planning', 'close plan', 'stop planning']
---

# End Plan Skill

End the planning phase for the current PR. This command:

1. Stops the background plan review watcher (if running)
2. Shows the final review status from CI
3. Displays PR summary
4. Suggests next steps

## Instructions

When the user invokes this skill:

1. **Run the end-plan script:**

   ```bash
   bash .claude/scripts/end-plan.sh
   ```

2. **Based on the final status:**
   - **APPROVED**: Offer to start implementation. Ask what part they want to work on first.
   - **NEEDS REVISION**: Remind them to address the feedback before implementing.
   - **No review yet**: Let them know CI hasn't reviewed yet, they can restart the watcher if needed.

3. **Transition to implementation mode** if the plan was approved - you're now ready to code!

## Usage

User can say:

- `/end-plan`
- "end plan"
- "done planning"
- "finish planning"
- "close plan"
