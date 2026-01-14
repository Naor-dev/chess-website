# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive chess website allowing users to:

- Sign in with Google OAuth
- Play chess against an AI engine (Stockfish)
- Choose difficulty levels (1-5) and time controls
- Save games and continue later

**Status:** Infrastructure, database, and CI/CD complete - starting feature development

## Development Commands

```bash
# Install dependencies (from root)
pnpm install

# Development - run all apps
pnpm dev

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format code
pnpm format

# Backend only
cd apps/backend
pnpm dev              # Start with nodemon
pnpm prisma:studio    # Open Prisma Studio
pnpm prisma:migrate   # Run migrations
pnpm test             # Run Jest tests
pnpm test:watch       # Run tests in watch mode

# Frontend only
cd apps/frontend
pnpm dev              # Start Next.js dev server (port 3000)
```

## Architecture

### Monorepo Structure (pnpm workspaces + Turborepo)

```
chess-website/
├── apps/
│   ├── backend/        # Express + TypeScript (port 3001)
│   └── frontend/       # Next.js 16 + TypeScript (port 3000)
├── packages/
│   └── shared/         # Shared types & Zod validators
├── turbo.json          # Build orchestration
└── pnpm-workspace.yaml
```

### Backend (apps/backend)

**Layered architecture:** routes → controllers → services → repositories

Key patterns:

- **Controllers** extend `BaseController` for standardized responses + Sentry integration
- **Services** contain business logic with Sentry breadcrumbs
- **Repositories** extend `BaseRepository` with `executeWithErrorHandling()` for automatic Sentry capture
- **Config** via `src/config/unifiedConfig.ts` (NEVER use process.env directly)
- **Validation** via Zod schemas from `@chess-website/shared`
- **Error tracking** via Sentry (`src/instrument.ts` must be first import)
- **Database** via Prisma singleton at `src/database/prisma.ts`

Key files:

- `src/instrument.ts` - Sentry initialization (MUST be imported first in app.ts)
- `src/app.ts` - Express setup with middleware
- `src/config/unifiedConfig.ts` - Type-safe configuration
- `src/database/prisma.ts` - Prisma client singleton with retry logic
- `src/controllers/BaseController.ts` - `handleError(error, res, operation)` pattern
- `src/repositories/BaseRepository.ts` - `executeWithErrorHandling()` for all DB operations
- `src/services/gameService.ts` - Game business logic
- `src/repositories/GameRepository.ts` - Game database access

### Frontend (apps/frontend)

**Next.js App Router** with feature-based organization

- **API client** at `src/lib/apiClient.ts` (Axios with interceptors)
- **Query client** at `src/lib/queryClient.ts` (TanStack Query)
- **Styling** via TailwindCSS

### Shared Package (packages/shared)

- `src/types/` - Game, User, API response types
- `src/validators/` - Zod schemas for request validation

Import in apps: `import { GameResponse, createGameSchema } from '@chess-website/shared'`

## Git/GitHub Rules

1. **NEVER merge PRs** - Only create PRs, user will merge manually
2. **NEVER push directly to main** - Always use feature branches
3. **Create PRs with clear descriptions** - Include summary and test plan

## Backend Development Rules

1. **All errors to Sentry** - Use `this.executeWithErrorHandling()` in repositories or `this.handleError()` in controllers
2. **Never use process.env** - Always use `import { config } from './config/unifiedConfig'`
3. **Controllers extend BaseController** - Use `handleSuccess()`, `handleError()`, `handleValidationError()`
4. **Repositories extend BaseRepository** - Use `executeWithErrorHandling(operation, fn, context)` for all DB operations
5. **Validate all input** - Use Zod schemas from shared package

## Database Patterns

```typescript
// Repository method pattern - always use executeWithErrorHandling
async findById(id: string): Promise<Entity | null> {
  return this.executeWithErrorHandling(
    'findById',
    () => this.prisma.entity.findUnique({ where: { id } }),
    { id }
  );
}

// Prisma client usage - import from database/prisma.ts
import { prisma, connectWithRetry, verifyConnection } from '../database/prisma';
```

## Key Resources

- **PRD:** `PRD.md` - Full product requirements (local)
- **Project Board:** https://github.com/users/Naor-dev/projects/4

## GitHub Project API

Project ID: `PVT_kwHOA4D8Lc4BMYoB`
Status Field ID: `PVTSSF_lAHOA4D8Lc4BMYoBzg7ro58`

Status option IDs:

- Backlog: `f75ad846`
- Ready: `61e4505c`
- In progress: `47fc9ee4`
- In review: `df73e18b`
- Done: `98236657`

```bash
# Move item to Done
gh api graphql -f query='
  mutation {
    updateProjectV2ItemFieldValue(
      input: {
        projectId: "PVT_kwHOA4D8Lc4BMYoB"
        itemId: "ITEM_ID_HERE"
        fieldId: "PVTSSF_lAHOA4D8Lc4BMYoBzg7ro58"
        value: { singleSelectOptionId: "98236657" }
      }
    ) { projectV2Item { id } }
  }
'
```

## Core Features (from PRD)

1. **Authentication:** Google OAuth only (F-1 to F-3)
2. **New Game:** Select difficulty (1-5) and time control (F-4 to F-7)
3. **Chess Rules:** Full legal move validation including castling, en passant, promotion (F-8 to F-11)
4. **AI Engine:** 5 difficulty levels affecting search depth (F-12 to F-15)
5. **Time Control:** Chess clocks with increment support (F-16 to F-19)
6. **Save/Load:** Persist game state to database (F-20 to F-24)
7. **Game End:** Detect checkmate, stalemate, draw conditions, timeout (F-25, F-26)

## Available Skills

- **backend-dev-guidelines** - Node.js/Express/TypeScript patterns (auto-activates for backend files)
- **frontend-dev-guidelines** - React/TypeScript patterns (auto-activates for frontend files)
- **ux-advisor** - Web design guidance (toggle: `/ux-advisor-on`, `/ux-advisor-off`)
- **route-tester** - Testing authenticated API routes
- **error-tracking** - Sentry integration patterns

## Available Agents

Use the Task tool with these specialized agents:

- **Plan** - Design implementation plans before coding
- **code-architecture-reviewer** - Review code for best practices
- **refactor-planner** - Plan refactoring strategies
- **frontend-error-fixer** - Debug frontend errors

## CI/CD Pipeline

GitHub Actions workflows in `.github/workflows/`:

| Workflow                 | Purpose                             | Trigger                 |
| ------------------------ | ----------------------------------- | ----------------------- |
| `ci.yml`                 | Build, Lint, Test, Prisma, Security | Every push/PR to main   |
| `codeql.yml`             | SAST Analysis                       | Every push/PR + Weekly  |
| `container-security.yml` | Container Scan (Trivy)              | When Dockerfiles change |

**CI checks include:** format, lint, prisma validate/generate, build, test, dependency audit, license check, Gitleaks secret scanning.

**Local pre-push hook:** `.husky/pre-push` runs CI checks before every push (local only, not in git).

## Hosting

| Service  | Platform | URL                                               |
| -------- | -------- | ------------------------------------------------- |
| Frontend | Vercel   | https://chess-website-frontend-beta.vercel.app    |
| Backend  | Koyeb    | https://improved-harmonia-yada-2bbdf472.koyeb.app |
| Database | Supabase | PostgreSQL (managed)                              |

## Current Progress

**Done:**

- #90: Frontend project (Next.js)
- #91: Backend project (Express)
- #92: Database setup (PostgreSQL + Prisma)
- #93: CI/CD pipeline (GitHub Actions)
- #94: Hosting (Vercel + Koyeb + Supabase)

**Ready:**

- #95: Environment variables
- #96: HTTPS and domain
