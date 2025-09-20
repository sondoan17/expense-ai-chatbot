# expense-ai-chatbot

Monorepo for the AI-first expense tracking assistant. This repository now ships with a workspace skeleton for the frontend (React), backend (NestJS), and shared packages.

## Structure

- `apps/web` � React client (Vite) � Phase 1 will replace the placeholder bootstrap.
- `apps/api` � NestJS service � Phase 1 will introduce real modules/controllers.
- `packages/shared` � Cross-cutting types, validation schemas, utils.
- `packages/ui` � Reusable UI primitives for the web app.
- `prisma/` � Placeholder for schema and migrations.
- `docker/` � Placeholder for compose/deploy assets.

## Tooling

- npm workspaces orchestrated by Turborepo
- TypeScript project references across apps/packages (`tsconfig.base.json`)
- ESLint + Prettier with a Husky pre-commit hook running `lint-staged`
- `.env.example` documents required secrets for local development

## Common Scripts

```bash
npm install          # install workspace deps
npm run lint         # run ESLint across all packages via turbo
npm run format       # check formatting
npm run format:write # apply prettier fixes
```

> Build/dev scripts are placeholders until the real app code arrives in Phase 1.

## Next steps

1. Flesh out Prisma schema + database wiring.
2. Scaffold NestJS modules/services/controllers.
3. Replace the React placeholder with the real chat UI.
