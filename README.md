# Chess Website

A modern chess web application where users can play against an AI engine (Stockfish) with customizable difficulty levels and time controls.

## Features

- **Google OAuth Authentication** - Sign in securely with your Google account
- **Play vs Stockfish AI** - 5 difficulty levels from Beginner to Master
- **Time Controls** - Multiple options from Bullet (1 min) to Classical (30 min)
- **Save & Continue** - Games are saved automatically, continue anytime
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **react-chessboard** - Chess board visualization
- **TanStack Query** - Server state management

### Backend

- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe development
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Passport.js** - Google OAuth authentication
- **chess.js** - Chess move validation
- **Stockfish** - Chess engine for AI opponent

### Infrastructure

- **Turborepo** - Monorepo build system
- **pnpm** - Fast package manager
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Frontend hosting
- **Koyeb** - Backend hosting
- **Supabase** - PostgreSQL database

## Project Structure

```
chess-website/
├── apps/
│   ├── backend/          # Express API server
│   └── frontend/         # Next.js web app
├── packages/
│   └── shared/           # Shared types & validators
├── .github/workflows/    # CI/CD configuration
└── turbo.json            # Turborepo configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/Naor-dev/chess-website.git
cd chess-website

# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your database URL and OAuth credentials
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Frontend runs on http://localhost:3000
# Backend runs on http://localhost:3001
```

### Building

```bash
# Build all packages
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
cd apps/backend && pnpm test
```

## Environment Variables

### Backend

| Variable             | Description                |
| -------------------- | -------------------------- |
| DATABASE_URL         | PostgreSQL connection URL  |
| JWT_SECRET           | Secret for JWT signing     |
| GOOGLE_CLIENT_ID     | Google OAuth client ID     |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| FRONTEND_URL         | Frontend URL for CORS      |

### Frontend

| Variable            | Description     |
| ------------------- | --------------- |
| NEXT_PUBLIC_API_URL | Backend API URL |

## API Endpoints

| Method | Path                      | Description        |
| ------ | ------------------------- | ------------------ |
| GET    | /api/health               | Health check       |
| GET    | /api/auth/google          | Start Google OAuth |
| GET    | /api/auth/google/callback | OAuth callback     |
| POST   | /api/auth/logout          | Logout user        |
| GET    | /api/auth/me              | Get current user   |
| POST   | /api/games                | Create new game    |
| GET    | /api/games                | List user's games  |
| GET    | /api/games/:id            | Get game by ID     |

## Deployment

The application is deployed using:

- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Koyeb (Docker container)
- **Database**: Supabase PostgreSQL

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Create a pull request

## License

MIT
