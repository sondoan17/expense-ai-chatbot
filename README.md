# expense-ai-chatbot

Expense AI is a monorepo that showcases an AI-assisted personal expense manager. The project now includes a full React PWA front-end, a NestJS backend, and shared packages for types and schemas.

## Structure

- `apps/web` � React + Vite client with chat experience, dashboards, charts, offline queue, and PWA setup.
- `apps/api` � NestJS service exposing auth, transactions, budgets, reports, and agent endpoints.
- `packages/shared` � Shared Zod schemas, enums, and category helpers used on both tiers.
- `packages/ui` � Placeholder workspace for future shared UI primitives.
- `prisma/` � Prisma schema, migrations, and seed script.

## Tooling & Scripts

- npm workspaces orchestrated via Turborepo.
- TypeScript strict configs with central `tsconfig.base.json` path aliases.
- ESLint + Prettier with Husky pre-commit hooks.
- Prisma CLI helpers (`npm run db:generate`, `db:migrate`, `db:deploy`, `db:seed`).
- `.env.example` documents required environment variables (PostgreSQL, Hyperbolic, JWT, timezone).

Common commands:

```bash
npm install              # install all workspace dependencies
npm run dev              # start Vite + Nest (proxy /api in dev)
npm run lint             # run ESLint for every package
npm run format           # check formatting
npm run format:write     # auto-format sources
npm run db:generate      # regenerate Prisma client
npm run build -w apps/api # build the API
npm run build -w apps/web # build the web PWA
```

## Frontend (Phase 4)

- Responsive shell with navigation between chat and dashboard.
- Authentication flow (email/password) with token storage and automatic refresh of the profile endpoint.
- Chat experience backed by the `/agent/chat` endpoint with optimistic UX, quick suggestions, delivery states, and offline queueing (messages are stored with `localforage` while offline and synced when the network returns).
- Dashboard with TanStack Query + Chart.js showing category breakdown, cashflow line chart, budget progress, and recent activity.
- React Query for caching/API coordination, React Router for routing, PWA support via `vite-plugin-pwa`, and a configurable service worker for API runtime caching.
- Online/offline indicators and background sync hook to replay queued chat requests.

## Backend Highlights

- Auth: `/auth/register`, `/auth/login`, `/users/me`.
- Transactions: `/transactions` CRUD, `/transactions/summary`, list and totals with filters.
- Budgets: `/budgets`, `/budgets/:id/status`.
- Reports: `/reports/overview` for dashboard insights.
- Agent: `/agent/chat` orchestrates Hyperbolic LLM intent parsing and executes transactions/budgets flows.
- Prisma + PostgreSQL data layer with category taxonomy and helper utilities shared with the web client.

## Next Ideas

1. Extend agent flows with undo/delete confirmations and richer prompt templating.
2. Add collaborative features (shared household spaces, multi-user budgets).
3. Implement end-to-end tests (e.g., Playwright) for the PWA flows.
4. Wire CI/CD and deployment manifests (Docker Compose, Render/Vercel pipelines).
