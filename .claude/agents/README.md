# Agents

Specialized agents for complex, multi-step tasks.

---

## What Are Agents?

Agents are autonomous Claude instances that handle specific complex tasks. Unlike skills (which provide inline guidance), agents:

- Run as separate sub-tasks
- Work autonomously with minimal supervision
- Have specialized tool access
- Return comprehensive reports when complete

**Key advantage:** Agents are **standalone** - just copy the `.md` file and use immediately!

---

## Available Agents (18)

### architect

**Purpose:** Software architecture specialist for system design, scalability, and technical decisions

**When to use:**

- Planning major new features
- Evaluating technical trade-offs
- Making architectural decisions
- Designing system scalability

**Integration:** ✅ Copy as-is

---

### code-reviewer

**Purpose:** Review code for security (OWASP, XSS, SQL injection, CSRF), performance (N+1, React), and best practices

**When to use:**

- After implementing a new feature
- When modifying auth/security code
- Before merging significant changes
- To catch security vulnerabilities early

**Integration:** ✅ Copy as-is

---

### code-refactor-master

**Purpose:** Plan and execute comprehensive refactoring

**When to use:**

- Reorganizing file structures
- Breaking down large components
- Updating import paths after moves
- Improving code maintainability

**Integration:** ✅ Copy as-is

---

### dead-code-cleaner

**Purpose:** Identify and safely remove dead code, unused exports, and redundant dependencies

**When to use:**

- After major refactors (find orphaned code)
- Reducing bundle size (unused dependencies)
- Codebase cleanup (unused exports, duplicate code)
- Pre-release cleanup

**Integration:** ✅ Copy as-is (install knip/depcheck/ts-prune if needed)

---

### database-reviewer

**Purpose:** PostgreSQL/Prisma specialist for query optimization, schema design, and N+1 detection

**When to use:**

- Reviewing database queries
- Optimizing slow queries
- Schema design review
- Detecting N+1 patterns

**Integration:** ✅ Copy as-is

---

### documentation-architect

**Purpose:** Create documentation and codemaps that match actual code (uses AST analysis)

**When to use:**

- Generating codemaps (`docs/CODEMAPS/`)
- Documenting new features
- Creating/updating API documentation
- Validating existing docs are current
- Pre-release documentation audit

**Integration:** ✅ Copy as-is (install madge/jsdoc2md if needed for AST features)

---

### e2e-runner

**Purpose:** E2E testing specialist using Playwright for critical user journey testing

**When to use:**

- Creating E2E tests for user flows
- Running and debugging E2E tests
- Managing flaky tests
- CI/CD test integration

**Integration:** ✅ Copy as-is (requires Playwright)

---

### frontend-error-fixer

**Purpose:** Debug and fix frontend errors

**When to use:**

- Browser console errors
- TypeScript compilation errors in frontend
- React errors
- Build failures

**Integration:** ⚠️ May reference screenshot paths - update if needed

---

### go-build-resolver

**Purpose:** Diagnose and fix Go compilation errors with minimal changes

**When to use:**

- Go build failures
- `go vet` warnings
- Module dependency issues
- Type errors in Go code

**Integration:** ✅ Copy as-is (Go projects only)

---

### go-reviewer

**Purpose:** Go code review for security, error handling, concurrency, and best practices

**When to use:**

- Reviewing Go code changes
- Security audit of Go code
- Concurrency review
- Error handling patterns

**Integration:** ✅ Copy as-is (Go projects only)

---

### planner

**Purpose:** Create detailed implementation plans for complex features (use BEFORE coding)

**When to use:**

- Before implementing new features
- Planning complex refactoring
- Architectural decisions
- Breaking down large tasks

**Integration:** ✅ Copy as-is

**Workflow:** `planner` (creates plan) → `plan-reviewer` (reviews) → Implementation

---

### plan-reviewer

**Purpose:** Review development plans before implementation

**When to use:**

- After planner creates a plan
- Validating architectural plans
- Identifying potential issues early
- Getting second opinion on approach

**Integration:** ✅ Copy as-is

---

### refactor-planner

**Purpose:** Create comprehensive refactoring strategies

**When to use:**

- Planning code reorganization
- Modernizing legacy code
- Breaking down large files
- Improving code structure

**Integration:** ✅ Copy as-is

---

### tdd-guide

**Purpose:** Test-driven development specialist enforcing write-tests-first methodology

**When to use:**

- Starting new features with TDD
- Improving test coverage
- Learning TDD workflow
- Enforcing testing standards

**Integration:** ✅ Copy as-is

---

### web-research-specialist

**Purpose:** Research technical issues online

**When to use:**

- Debugging obscure errors
- Finding solutions to problems
- Researching best practices
- Comparing implementation approaches

**Integration:** ✅ Copy as-is

---

### auth-route-tester

**Purpose:** Test authenticated API endpoints

**When to use:**

- Testing routes with JWT cookie auth
- Validating endpoint functionality
- Debugging authentication issues

**Integration:** ⚠️ Requires JWT cookie-based auth

---

### auth-route-debugger

**Purpose:** Debug authentication issues

**When to use:**

- Auth failures
- Token issues
- Cookie problems
- Permission errors

**Integration:** ⚠️ Requires JWT cookie-based auth

---

### auto-error-resolver

**Purpose:** Automatically fix TypeScript compilation errors

**When to use:**

- Build failures with TypeScript errors
- After refactoring that breaks types
- Systematic error resolution needed

**Integration:** ⚠️ May need path updates

---

## How to Integrate an Agent

### Standard Integration (Most Agents)

**Step 1: Copy the file**

```bash
cp showcase/.claude/agents/agent-name.md \\
   your-project/.claude/agents/
```

**Step 2: Verify (optional)**

```bash
# Check for hardcoded paths
grep -n "~/git/\|/root/git/\|/Users/" your-project/.claude/agents/agent-name.md
```

**Step 3: Use it**
Ask Claude: "Use the [agent-name] agent to [task]"

That's it! Agents work immediately.

---

### Agents Requiring Customization

**frontend-error-fixer:**

- May reference screenshot paths
- Ask user: "Where should screenshots be saved?"
- Update paths in agent file

**auth-route-tester / auth-route-debugger:**

- Require JWT cookie authentication
- Update service URLs from examples
- Customize for user's auth setup

**auto-error-resolver:**

- May have hardcoded project paths
- Update to use `$CLAUDE_PROJECT_DIR` or relative paths

---

## When to Use Agents vs Skills

| Use Agents When...                | Use Skills When...              |
| --------------------------------- | ------------------------------- |
| Task requires multiple steps      | Need inline guidance            |
| Complex analysis needed           | Checking best practices         |
| Autonomous work preferred         | Want to maintain control        |
| Task has clear end goal           | Ongoing development work        |
| Example: "Review all controllers" | Example: "Creating a new route" |

**Both can work together:**

- Skill provides patterns during development
- Agent reviews the result when complete

---

## Agent Quick Reference

| Agent                   | Complexity | Customization       | Auth Required |
| ----------------------- | ---------- | ------------------- | ------------- |
| architect               | High       | ✅ None             | No            |
| code-reviewer           | Medium     | ✅ None             | No            |
| code-refactor-master    | High       | ✅ None             | No            |
| database-reviewer       | Medium     | ✅ None             | No            |
| dead-code-cleaner       | Medium     | ✅ None             | No            |
| documentation-architect | Medium     | ✅ None             | No            |
| e2e-runner              | Medium     | ✅ None             | No            |
| frontend-error-fixer    | Medium     | ⚠️ Screenshot paths | No            |
| go-build-resolver       | Low        | ✅ None             | No (Go only)  |
| go-reviewer             | Medium     | ✅ None             | No (Go only)  |
| planner                 | Medium     | ✅ None             | No            |
| plan-reviewer           | Low        | ✅ None             | No            |
| refactor-planner        | Medium     | ✅ None             | No            |
| tdd-guide               | Medium     | ✅ None             | No            |
| web-research-specialist | Low        | ✅ None             | No            |
| auth-route-tester       | Medium     | ⚠️ Auth setup       | JWT cookies   |
| auth-route-debugger     | Medium     | ⚠️ Auth setup       | JWT cookies   |
| auto-error-resolver     | Low        | ⚠️ Paths            | No            |

---

## For Claude Code

**When integrating agents for a user:**

1. **Read [CLAUDE_INTEGRATION_GUIDE.md](../../CLAUDE_INTEGRATION_GUIDE.md)**
2. **Just copy the .md file** - agents are standalone
3. **Check for hardcoded paths:**
   ```bash
   grep "~/git/\|/root/" agent-name.md
   ```
4. **Update paths if found** to `$CLAUDE_PROJECT_DIR` or `.`
5. **For auth agents:** Ask if they use JWT cookie auth first

**That's it!** Agents are the easiest components to integrate.

---

## Creating Your Own Agents

Agents are markdown files with optional YAML frontmatter:

```markdown
# Agent Name

## Purpose

What this agent does

## Instructions

Step-by-step instructions for autonomous execution

## Tools Available

List of tools this agent can use

## Expected Output

What format to return results in
```

**Tips:**

- Be very specific in instructions
- Break complex tasks into numbered steps
- Specify exactly what to return
- Include examples of good output
- List available tools explicitly

---

## Troubleshooting

### Agent not found

**Check:**

```bash
# Is agent file present?
ls -la .claude/agents/[agent-name].md
```

### Agent fails with path errors

**Check for hardcoded paths:**

```bash
grep "~/\|/root/\|/Users/" .claude/agents/[agent-name].md
```

**Fix:**

```bash
sed -i 's|~/git/.*project|$CLAUDE_PROJECT_DIR|g' .claude/agents/[agent-name].md
```

---

## Next Steps

1. **Browse agents above** - Find ones useful for your work
2. **Copy what you need** - Just the .md file
3. **Ask Claude to use them** - "Use [agent] to [task]"
4. **Create your own** - Follow the pattern for your specific needs

**Questions?** See [CLAUDE_INTEGRATION_GUIDE.md](../../CLAUDE_INTEGRATION_GUIDE.md)
