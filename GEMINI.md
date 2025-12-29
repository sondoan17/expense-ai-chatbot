# GEMINI.md - Project Context for AI Assistants

This document provides context for AI coding assistants (Gemini, Copilot, Cursor, etc.) working on the Mimi expense chatbot project.

## 📚 Nested Documentation

For detailed context on specific packages, see:

| Package            | Location                                               | Description                                 |
| ------------------ | ------------------------------------------------------ | ------------------------------------------- |
| **API Backend**    | [apps/api/GEMINI.md](apps/api/GEMINI.md)               | NestJS modules, DTOs, services, controllers |
| **Web Frontend**   | [apps/web/GEMINI.md](apps/web/GEMINI.md)               | React features, hooks, state management     |
| **Shared Package** | [packages/shared/GEMINI.md](packages/shared/GEMINI.md) | Zod schemas, enums, utilities               |

> **Note**: Always check the package-specific GEMINI.md for detailed conventions when working on that package.

## 📝 Documentation Maintenance Rules

**IMPORTANT**: When making changes to the codebase, you MUST update the relevant documentation:

| Change Type                  | Action Required                                       |
| ---------------------------- | ----------------------------------------------------- |
| Add new module/feature       | Update the corresponding `GEMINI.md` (api/web/shared) |
| Add new API endpoint         | Document in `apps/api/GEMINI.md`                      |
| Add new React feature/page   | Document in `apps/web/GEMINI.md`                      |
| Add new shared export        | Document in `packages/shared/GEMINI.md`               |
| Change environment variables | Update both root `GEMINI.md` and `DEPLOYMENT.md`      |
| Add new intent/agent handler | Update `AGENTS.md`                                    |
| Change deployment process    | Update `DEPLOYMENT.md`                                |
| Change directory structure   | Update all affected `GEMINI.md` files                 |

> ⚠️ **Rule**: Documentation updates should be done in the **same commit** as the code changes.

## Project Overview

**Mimi** is a production-grade expense management application that combines a chat-first experience with traditional dashboards. Users can capture expenses, incomes, budgets, and recurring rules in natural Vietnamese or English through an AI-powered chat interface.

## Technology Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: NestJS (apps/api)
- **Frontend**: React + Vite PWA (apps/web)
- **Database**: PostgreSQL with Prisma ORM
- **LLM Integration**: Hyperbolic API (Qwen model)
- **Shared Code**: TypeScript packages with zod schemas

## Repository Structure

```
expense-ai-chatbot/
├── apps/
│   ├── api/                    # NestJS backend
│   │   └── src/
│   │       ├── modules/        # Feature modules
│   │       │   ├── agent/      # Chat agent (LLM integration)
│   │       │   ├── auth/       # Authentication (JWT)
│   │       │   ├── budgets/    # Budget management
│   │       │   ├── recurring/  # Recurring transactions
│   │       │   ├── reports/    # Dashboard reports
│   │       │   ├── transactions/ # Expense/income CRUD
│   │       │   └── users/      # User management
│   │       ├── integrations/   # External services (Hyperbolic, Cloudinary)
│   │       ├── prisma/         # Prisma service
│   │       └── common/         # Shared decorators, guards
│   │
│   └── web/                    # React PWA frontend
│       └── src/
│           ├── features/       # Feature-based modules
│           │   ├── auth/       # Login/register screens
│           │   ├── chat/       # Chat interface
│           │   ├── dashboard/  # Analytics dashboard
│           │   ├── landing/    # Landing page
│           │   ├── manual-entry/ # Manual transaction entry
│           │   └── settings/   # User settings
│           ├── components/     # Shared UI components
│           ├── hooks/          # Custom React hooks
│           ├── api/            # API client
│           ├── contexts/       # React contexts
│           ├── offline/        # Offline queue logic
│           ├── store/          # Zustand stores
│           └── utils/          # Utility functions
│
├── packages/
│   ├── shared/                 # Shared types, schemas, utilities
│   │   └── src/
│   │       └── index.ts        # Zod schemas, enums, category helpers
│   └── ui/                     # Placeholder for shared UI primitives
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
│
└── docker/                     # Docker configuration
```

## Code Conventions

### TypeScript

- **Strict mode** enabled across all packages
- Use explicit type annotations for function parameters and return types
- Prefer interfaces over type aliases for object shapes
- Use `readonly` for immutable properties

### File Naming

- **Modules**: `kebab-case` for directories (e.g., `manual-entry/`)
- **Components**: `PascalCase.tsx` (e.g., `ChatBubble.tsx`)
- **Services/Utilities**: `kebab-case.ts` (e.g., `agent-response.utils.ts`)
- **DTOs**: `kebab-case.dto.ts` (e.g., `create-transaction.dto.ts`)
- **Schemas**: `kebab-case.schema.ts`

### NestJS (Backend)

- **Module structure**: Each feature has its own folder with:
  - `*.module.ts` - Module definition
  - `*.controller.ts` - REST endpoints
  - `*.service.ts` - Business logic
  - `*.dto.ts` - Data transfer objects (use class-validator)
  - `*.guard.ts` - Custom guards

- **Injection pattern**: Use constructor injection
- **Validation**: Use class-validator decorators on DTOs
- **Error handling**: Throw NestJS HTTP exceptions

### React (Frontend)

- **Feature-based architecture**: Group by feature, not by type
- **Component structure**:
  ```tsx
  // Imports
  // Types/interfaces
  // Component
  export function ComponentName({ props }: Props) {
    // Hooks first
    // Event handlers
    // Render
  }
  ```
- **State management**: TanStack Query for server state, Zustand for client state
- **Hooks**: Prefix custom hooks with `use` (e.g., `useOfflineAgentSync`)

### Prisma

- **Model naming**: `PascalCase` singular (e.g., `User`, `Transaction`)
- **Field naming**: `camelCase`
- **Relations**: Use explicit relation names
- **Migrations**: Run `pnpm db:migrate` after schema changes

### API Conventions

- **REST endpoints**: `/api/{resource}` pattern
- **Authentication**: JWT Bearer token in Authorization header
- **Response format**: Consistent JSON structure
- **Error responses**: Standard NestJS exception format

## Shared Package (@expense-ai/shared)

Exports:

- `AgentPayloadSchema` - Zod schema for LLM responses
- `CATEGORIES` - Canonical category list with Vietnamese synonyms
- `resolveCategoryName()` - Normalize category input
- `normalizeText()` - Strip diacritics, lowercase
- Enums: `Currency`, `TxnType`, `RecurringFreq`, `ChatRole`

**Usage**:

```ts
import { AgentPayloadSchema, resolveCategoryName, TxnType } from '@expense-ai/shared';
```

## Environment Variables

### Backend (apps/api)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/expense?schema=public
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=sk_xxx
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking
JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d
APP_TIMEZONE=Asia/Ho_Chi_Minh
```

### Frontend (apps/web)

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Common Commands

```bash
# Development
pnpm install                # Install all dependencies
pnpm dev                    # Start both API and web in dev mode
pnpm build                  # Build all packages

# Database
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Apply migrations
pnpm db:seed                # Seed initial data

# Code Quality
pnpm lint                   # Run ESLint
pnpm format:write           # Format with Prettier
```

## Linting & Formatting

### ESLint Configuration

- Parser: `@typescript-eslint/parser`
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:react/recommended`, `prettier`
- React JSX runtime enabled (no need to import React)

### Prettier Configuration

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

### Pre-commit Hooks

- Husky + lint-staged runs ESLint and Prettier on staged files

## Agent System (LLM Integration)

The `/agent/chat` endpoint processes natural language:

1. User message → Hyperbolic LLM classification
2. Parse JSON response with `AgentPayloadSchema`
3. Route to intent handler (add_expense, set_budget, etc.)
4. Build deterministic response (not LLM-generated)
5. Persist in `ChatMessage` table

See `AGENTS.md` for full intent documentation.

## Key Patterns

### Offline Support (Frontend)

- `localforage` for offline queue
- `useOfflineAgentSync` hook replays messages when online
- Chat history loads from `/agent/history`

### Recurring Transactions

- `RecurringRule` stores scheduling metadata
- `RecurringService.processDueRules()` for cron execution
- Natural language parsing (hàng ngày, hằng tuần, etc.)

### Budget Tracking

- Monthly budgets with optional category
- Real-time spent calculation
- Warning system when approaching limit

## Testing Guidelines

- TypeScript strict mode catches most type errors
- Zod schemas validate API boundaries
- Future: Jest for unit tests, Playwright for E2E

## Deployment

- Backend: Automate deployment using GitHub Actions
- Frontend: Automate deployment using GitHub Actions
- Database: Managed PostgreSQL (Prisma Cloud DB)
- See `DEPLOYMENT.md` for detailed instructions
