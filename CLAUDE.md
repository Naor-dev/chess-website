# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive chess website allowing users to:

- Sign in with Google OAuth
- Play chess against an AI engine (Stockfish)
- Choose difficulty levels (1-5) and time controls
- Save games and continue later

**Status:** Authentication, New Game, Game Board UI complete - implementing move handling next

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

- **BFF API routes** at `src/app/api/` - Handle auth and proxy to backend (first-party cookies)
- **API client** at `src/lib/apiClient.ts` (Axios with `/api/proxy` base URL)
- **Auth API** at `src/lib/authApi.ts` (uses local `/api/auth/*` routes)
- **Game API** at `src/lib/gameApi.ts` (create, get, list games via proxy)
- **Auth state** via `src/contexts/AuthContext.tsx` (useAuth hook)
- **Query client** at `src/lib/queryClient.ts` (TanStack Query)
- **Styling** via TailwindCSS

Key pages:

- `/` - Home page with sign in
- `/auth/callback` - OAuth callback handler
- `/auth/error` - Auth error display
- `/game/new` - New game settings (difficulty, time control)
- `/game/[id]` - Game board with clocks and status

### Shared Package (packages/shared)

- `src/types/` - Game, User, API response types
- `src/validators/` - Zod schemas for request validation

Import in apps: `import { GameResponse, createGameSchema } from '@chess-website/shared'`

## Git/GitHub Rules

1. **NEVER merge PRs** - Only create PRs, user will merge manually
2. **NEVER push directly to main** - Always use feature branches
3. **Create PRs with clear descriptions** - Include summary and test plan
4. **Run Playwright UI tests before pushing** - For any frontend changes, test the affected pages using Playwright browser tools before pushing. Navigate to the page, interact with new features, verify they work visually.

## Backend Development Rules

1. **All errors to Sentry** - Use `this.executeWithErrorHandling()` in repositories or `this.handleError()` in controllers
2. **Never use process.env** - Always use `import { config } from './config/unifiedConfig'`
3. **Controllers extend BaseController** - Use `handleSuccess()`, `handleError()`, `handleValidationError()`
4. **Repositories extend BaseRepository** - Use `executeWithErrorHandling(operation, fn, context)` for all DB operations
5. **Validate all input** - Use Zod schemas from shared package
6. **Always verify game ownership** - When implementing game endpoints, use `gameService.getGame(gameId, userId)` to verify the user owns the game before any operation

## API Response Pattern

**IMPORTANT:** Backend wraps all responses via `handleSuccess()`:

```typescript
// Backend returns:
{ "success": true, "data": { /* actual response */ } }

// Frontend must access:
response.data.data.user  // NOT response.data.user
```

When adding new API endpoints, ensure frontend correctly navigates the wrapper structure.

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

## Testing

**Framework:** Jest + ts-jest (backend), Supertest for API tests

```bash
# Run all tests
pnpm test

# Run backend tests only
cd apps/backend && pnpm test

# Run tests in watch mode
cd apps/backend && pnpm test:watch

# Run a single test file
cd apps/backend && npx jest src/services/__tests__/gameService.test.ts

# Run tests matching a pattern
cd apps/backend && npx jest --testNamePattern="createGame"
```

**Test structure:**

```
apps/backend/src/
├── services/__tests__/
│   └── gameService.test.ts    # Unit tests (mock repository)
└── controllers/__tests__/
    └── gameController.test.ts # API integration tests (supertest)
```

**Test patterns:**

```typescript
// Unit test - mock dependencies
const mockRepository = { create: jest.fn(), findById: jest.fn() };
const service = new GameService(mockRepository as unknown as GameRepository);

// API test - mock auth and services
jest.mock('../../services/serviceContainer', () => ({
  services: { authService: { verifyToken: mockVerifyToken }, gameService: mockGameService },
}));

const response = await request(app)
  .post('/api/games')
  .set('Authorization', 'Bearer token')
  .send({ difficultyLevel: 3, timeControlType: 'blitz_5min' });
```

**Current coverage:** 79 tests (25 gameService + 30 gameController + 24 authController)

### Playwright UI Testing

**IMPORTANT:** Before pushing any frontend changes, run Playwright tests:

1. Start dev servers: `pnpm dev` (runs both frontend and backend)
2. Wait for servers to be ready (backend: localhost:3001, frontend: localhost:3000)
3. Use Playwright MCP tools to:
   - Navigate to affected pages
   - Test new/changed functionality (click buttons, fill forms, drag pieces, etc.)
   - Verify visual feedback (loading states, error messages, success states)
   - Take screenshots to document the testing

**Example test flow for game features:**

```
1. Navigate to localhost:3000
2. Sign in (if needed)
3. Create new game
4. Test the specific feature (e.g., drag piece, verify move)
5. Verify board state updates correctly
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
- **secure-coding** - Security patterns for auth, JWT, tokens, passwords (auto-activates)
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

**CI secrets required:**

- `GOOGLE_CLIENT_ID` - Google OAuth client ID (for passport initialization in tests)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

**Note:** CI runs tests with `pnpm -r test` (not turbo) to ensure env vars are passed correctly to Jest.

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
- #96: HTTPS and domain
- Google OAuth authentication (PR #107)
- Epic 2: New Game Creation (#10-#18, #72) - difficulty/time selection, game creation API
- PR #110: Game Board Page (#75-#78, #20, #21, #27, #42) - chess board display, clocks, status messages
- Epic 8: Home Page UI (#67-#71) - design, logo, description, centered login
- PR #111: UI/UX improvements - chess-themed design system, dark mode, animations

**In Progress:**

- Move handling (#22, #23) - chess.js integration, drag and drop
- Engine integration (#36) - API endpoint for engine moves

**Next Up:**

- #43: Start/stop clock based on turn
- #79: Make Save button functional

## Authentication Flow (BFF Pattern)

Uses Backend-for-Frontend pattern for cross-browser cookie support (works in Firefox, Safari, etc.):

```
User clicks "Sign in with Google"
  → Frontend redirects to /api/auth/google (Next.js API route)
  → Next.js redirects to Google OAuth consent
  → User grants permission
  → Google redirects to /api/auth/callback (Next.js API route)
  → Next.js exchanges code with Google for user info
  → Next.js calls backend POST /api/auth/exchange with Google user data
  → Backend finds/creates user, returns JWT
  → Next.js sets HttpOnly cookie on frontend domain (first-party)
  → Redirects to /auth/callback
  → Frontend calls refreshUser() via /api/auth/me
  → User sees authenticated UI
```

**Key benefit:** Cookie is set on Vercel domain (first-party), not Koyeb domain (third-party).

**Security hardening:**

- BFF exchange endpoint protected by `BFF_EXCHANGE_SECRET` with constant-time comparison
- Proxy route uses path allowlist (`games`, `users`, `auth` only)
- Path traversal protection (blocks `..`, encoded variants, control characters)
- OAuth redirects use hardcoded paths only (no user input in destinations)

Token revocation via `tokenVersion` field - incrementing invalidates all existing JWTs.

## Backend API Endpoints

**Auth endpoints (backend):**

| Method | Path                 | Description                                |
| ------ | -------------------- | ------------------------------------------ |
| GET    | /api/auth/google     | Initiate Google OAuth (legacy)             |
| GET    | /api/auth/callback   | Google OAuth callback (legacy)             |
| GET    | /api/auth/me         | Get current user                           |
| POST   | /api/auth/logout     | Logout (clear cookie)                      |
| POST   | /api/auth/logout-all | Invalidate all tokens                      |
| POST   | /api/auth/exchange   | BFF endpoint: exchange Google info for JWT |

**Game endpoints (backend):**

| Method | Path                      | Description        |
| ------ | ------------------------- | ------------------ |
| POST   | /api/games                | Create new game    |
| GET    | /api/games                | List user's games  |
| GET    | /api/games/:gameId        | Get specific game  |
| POST   | /api/games/:gameId/move   | Make a move        |
| POST   | /api/games/:gameId/resign | Resign game (TODO) |
| POST   | /api/games/:gameId/save   | Save game (TODO)   |

**Frontend BFF routes (Next.js API):**

| Method | Path                 | Description                      |
| ------ | -------------------- | -------------------------------- |
| GET    | /api/auth/google     | Redirect to Google OAuth         |
| GET    | /api/auth/callback   | Handle OAuth, set cookie         |
| GET    | /api/auth/me         | Get user (proxies to backend)    |
| POST   | /api/auth/logout     | Clear cookie                     |
| POST   | /api/auth/logout-all | Invalidate tokens + clear cookie |
| \*     | /api/proxy/[...path] | Proxy to backend with JWT        |

**Game types (from shared package):**

- `DifficultyLevel`: 1-5
- `TimeControlType`: none, bullet_1min, bullet_2min, blitz_3min, blitz_5min, rapid_10min, rapid_15min, classical_30min
- `TIME_CONTROL_CONFIGS`: Maps time control to initial time (ms) and increment (ms)
- `STARTING_FEN`: Standard chess starting position

## Dev Docs Pattern

For complex features, create context files in `dev/active/`:

```
dev/active/
└── [feature]-context.md  # Current state, key files, next steps
```

**Usage:** Start session with "Read dev/active/[feature]-context.md for context"

This preserves knowledge across context resets.

## Design Guidelines

Comprehensive UI/UX design guidelines are available locally at `dev/design-guidelines.md` (gitignored). This includes:

- Color system (emerald theme, semantic colors, time control colors)
- Typography scale and hierarchy
- Layout and spacing (8px grid system)
- Component patterns (cards, badges, buttons, inputs)
- Loading and error states
- Dark mode implementation
- Animation guidelines
- Responsive design breakpoints
- Accessibility requirements (WCAG 2.1 AA)
- Chess-specific patterns (board, clocks, status messages)

**Use this local file instead of the `/ux-advisor` skill for design questions.**
