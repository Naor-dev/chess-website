#!/usr/bin/env node
/**
 * Plan Review with Gemini
 * Uses Google GenAI SDK to review implementation plans
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a Senior Technical Plan Reviewer, a meticulous architect with deep expertise in system integration, database design, and software engineering best practices. Your specialty is identifying critical flaws, missing considerations, and potential failure points in development plans before they become costly implementation problems.

When reviewing a plan, evaluate:

1. **Completeness** - Are all requirements addressed? Edge cases considered?
2. **Technical Soundness** - Is the architecture appropriate? Security considered?
3. **Risk Assessment** - What could go wrong? Dependencies that might block?
4. **Clarity** - Is it easy to understand? Steps actionable?
5. **Missing Elements** - What's not covered that should be?

Format your response as:
### ✅ Strengths
- List what's good about the plan

### ⚠️ Concerns
- List potential issues or risks

### 💡 Suggestions
- Actionable improvements

### 📋 Missing Considerations
- Things that should be added

### Overall Assessment
Give a brief overall assessment: APPROVED / NEEDS REVISION / MAJOR CHANGES NEEDED

Be constructive and specific. Reference specific parts of the plan when giving feedback.`;

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function reviewPlan(planContent, planPath) {
  console.log(`Reviewing plan with Gemini (${MODEL}): ${planPath}`);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `${SYSTEM_PROMPT}\n\n---\n\nPlease review the following implementation plan:\n\n**File:** ${planPath}\n\n---\n\n${planContent}`,
  });

  return response.text;
}

async function main() {
  const planFiles = process.env.PLAN_FILES
    ? process.env.PLAN_FILES.split('\n').filter((f) => f.trim())
    : [];

  if (planFiles.length === 0) {
    console.log('No plan files to review');
    process.exit(0);
  }

  const modelLabel = MODEL.toUpperCase().replace(/-/g, ' ');
  let fullReview = `# 🤖 Gemini Plan Review (${modelLabel})\n\n`;
  fullReview += `*Automated review by Google Gemini (${MODEL})*\n\n`;

  for (const planFile of planFiles) {
    if (!fs.existsSync(planFile)) {
      console.log(`Plan file not found: ${planFile}`);
      continue;
    }

    const content = fs.readFileSync(planFile, 'utf8');

    try {
      const review = await reviewPlan(content, planFile);
      fullReview += `---\n\n## 📄 ${planFile}\n\n${review}\n\n`;
    } catch (error) {
      console.error(`Error reviewing ${planFile}:`, error.message);
      fullReview += `---\n\n## 📄 ${planFile}\n\n❌ **Review Failed**\n\nGemini encountered an error:\n\n\`\`\`\n${error.message}\n\`\`\`\n\n`;
    }
  }

  // Write review to file for GitHub Action to pick up
  const outputPath = '/tmp/plan-review-gemini.md';
  fs.writeFileSync(outputPath, fullReview);
  console.log(`Review written to ${outputPath}`);

  // Also output to console
  console.log('\n' + '='.repeat(60) + '\n');
  console.log(fullReview);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
