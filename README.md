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

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Create a pull request

## License

MIT
