# Mimi

Mimi is a production-style side project that combines a chat-first experience with a full NestJS backend. Users can capture expenses, incomes, budgets, and recurring rules in natural Vietnamese or English, while still getting traditional dashboards and reports.

## Highlights

- Chat-driven capture powered by the Hyperbolic LLM with intent parsing, validation, and deterministic replies.
- React + Vite progressive web app with offline queueing, chat history, dashboards, and TanStack Query data layer.
- NestJS API covering auth, transactions, budgets, reports, recurring automation, and chat agent orchestration.
- Prisma + PostgreSQL schema with categories, chat transcripts, and recurring rule execution logs.
- Shared zod schemas and helpers that keep classifications, API DTOs, and the UI in sync.

## Repository layout

```
.
+- apps/
|  +- api/          # NestJS backend (REST + agent)
|  +- web/          # React PWA client
+- packages/
|  +- shared/       # Shared enums, zod schemas, category helpers
|  +- ui/           # Placeholder for shared UI primitives
+- prisma/          # Schema, migrations, seed helpers
+- docker/          # Container tooling (compose, deployment snippets)
```

## Backend (NestJS)

- Auth: email + password registration and login, bcrypt hashing, JWT bearer guard, /auth/register, /auth/login, /users/me.
- Transactions: CRUD endpoints, filtered lists, summaries, deletion, Luxon-based date range helpers, metadata storage.
- Budgets: upsert, list, delete, and live status (spent vs remaining vs overspent) by month and optional category.
- Reports: consolidated overview endpoint with totals, category breakdown, and recent transactions for the dashboard.
- Agent: `/agent/chat` and `/agent/history`, Hyperbolic classification prompt, chat persistence, confidence gating, multilingual replies, and support for add_expense, add_income, query_total, query_by_category, set_budget, get_budget_status, list_recent, set_recurring, undo_or_delete (placeholder), small_talk.
- Recurring automation: natural language scheduling (`set_recurring`) mapped to `RecurringRule`, intelligent update detection, `RecurringService.processDueRules` for cron workers, and execution logging.
- Integrations: Hyperbolic client with `response_format: json_object`, request preview logging, Prisma service bootstrap, configuration via `APP_TIMEZONE`, `HYPERBOLIC_*`, and JWT env vars.
- Persistence: chat transcripts stored in `ChatMessage`, transactions and budgets indexed for fast range queries, recurring run logs for auditing.

## Frontend (React + Vite PWA)

- Authentication flow with email/password screens, protected routes, and JWT storage synced from the backend.
- Chat page with suggestions, optimistic outgoing bubbles, offline queue backed by localforage, automatic sync when the network returns, and `/agent/history` bootstrap.
- Dashboard with TanStack Query, category donut, cashflow line, budget progress, and recent transaction feed.
- Shared layout, responsive navigation between Chat and Dashboard, light/dark ready design hints.
- Vite PWA plugin for installability, background API caching, and automatic service worker updates.
- Hooks: `useOfflineAgentSync`, `useOnlineStatus`, React Query mutations with typed API client.

## Shared package

- `packages/shared` exports zod schemas (`AgentPayloadSchema`, enums, category utilities, recurring frequency helpers).
- Canonical category list with Vietnamese-friendly synonyms mapped to normalized ASCII keys.
- Reusable normalization helpers (`normalizeText`, `resolveCategoryName`) used on both client and server.

## Data model

- `User`, `Transaction`, `Category`, `Budget`, `RecurringRule`, `RecurringRunLog`, `ChatMessage`.
- Enums: `Currency`, `TxnType`, `RecurringFreq`, `ChatRole`, `ChatMessageStatus`.
- Transactions and budgets index by user, category, and time for efficient summaries.
- Recurring rules track next/last run timestamps and embed timezone-aware scheduling metadata.
- Chat messages persist the assistant replies and error states for offline replay.

## Environment setup

1. Copy `.env.example` to `.env` at the project root.
2. Provide PostgreSQL credentials and Hyperbolic API key.
3. Optional: set `APP_TIMEZONE` (defaults to `Asia/Ho_Chi_Minh`) and `WEB_ORIGIN` for CORS.

Backend essentials:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/expense?schema=public
HYPERBOLIC_API_URL=https://api.hyperbolic.xyz/v1/chat/completions
HYPERBOLIC_API_KEY=sk_xxx
HYPERBOLIC_MODEL=Qwen/Qwen3-Next-80B-A3B-Thinking
JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d
APP_TIMEZONE=Asia/Ho_Chi_Minh
```

Frontend essentials:

```
VITE_API_BASE_URL=http://localhost:4000/api
WEB_ORIGIN=http://localhost:5173,http://localhost:4173
```

## Running locally

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run development servers (Vite + NestJS via Turborepo)
pnpm dev
```

The dev script proxies `/api/*` to the Nest server so the PWA can call authenticated endpoints during local development.

To apply migrations or seed initial data:

```bash
pnpm db:migrate         # prisma migrate deploy
pnpm db:seed            # populate base categories (seed script)
```

## Useful commands

- `pnpm build` – turbo builds API and web bundles.
- `pnpm lint` – workspace wide ESLint runs.
- `pnpm test` – placeholder hook for future unit tests.
- `pnpm format` / `pnpm format:write` – Prettier in check or write mode.

## Testing and quality

- TypeScript strict mode across API and web apps.
- ESLint + Prettier enforced via Husky and lint-staged pre-commit hooks.
- Prisma Client typings and DTO schemas provide end-to-end type safety.
- Agent payload validation uses zod to reject malformed or low-confidence extractions before execution.

## Deployment notes

- `docker/docker-compose.yml` spins up PostgreSQL and the API for local or staging use.
- The backend is stateless and ready for platforms such as Render or Railway; the web app can deploy to Vercel or Netlify.
- Set environment variables through your hosting provider, never commit secrets.
- Schedule `RecurringService.processDueRules` with a worker or cron job to realize automatic entries.

## Future ideas

- Undo/delete flows for agent commands.
- OCR of receipts feeding the agent.
- Multi-currency awareness with FX snapshots.
- Sharing spaces for households or teams.

## License

MIT (see `LICENSE` if provided).
