# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ascent** is a personal productivity platform ("Personal Operating System") for behavioral tracking, task management, time logging, compliance rule checking, and analytics.

## Tech Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS 4, Zustand, Radix UI, Framer Motion, Recharts
- **Backend:** NestJS 11, TypeScript, TypeORM, PostgreSQL, Passport.js (JWT + Local), Resend (email)

## Commands

### Backend (`/backend`)
```bash
npm run start:dev     # Dev server with hot reload (port 8000)
npm run build         # Compile TypeScript
npm run start:prod    # Run compiled build
npm run lint          # ESLint with auto-fix
npm run format        # Prettier
npm run test          # Unit tests (Jest)
npm run test:watch    # Watch mode
npm run test:cov      # Coverage
npm run test:e2e      # E2E tests
```

### Frontend (`/frontend`)
```bash
npm run dev           # Dev server (port 3000)
npm run build         # Production build
npm run start         # Serve production build
npm run lint          # ESLint
```

## Architecture

### Backend (NestJS)
Modular monolith: each feature domain (`auth`, `users`, `projects`, `tasks`, `time-entries`, `compliance`, `invites`, `mailer`, `ranking`, `milestones`, `analytics`, `advisor`, `api-tokens`, `mcp`) is a self-contained NestJS module following controller → service → TypeORM repository pattern.

- **Pure computation:** ranking (`ranking/ranking.compute.ts`), analytics (`analytics/analytics.compute.ts`) and repeat scheduling (`tasks/repeat-schedule.ts`) are pure functions with Jest specs; services only load data. Day bucketing uses the user's `timezone` via `common/dates.ts`.
- **Repeating tasks:** a per-minute cron in `TasksService` creates/carries over copies per the template's `repeatMode` (`carry_over` default, `pile_up`, `after_completion`).
- **Advisor:** `POST /advisor/threads/:id/messages` streams a Claude reply (model `ADVISOR_MODEL`, default `claude-sonnet-5-5`); without `ANTHROPIC_API_KEY` it returns a mock reply.
- **MCP:** `POST /mcp` is a stateless Streamable HTTP MCP server authenticated with personal API tokens (`asc_…`, created in Settings, stored hashed). No delete tools.

- **Auth:** Passport LocalStrategy (login) + JwtStrategy (route guards). JWT stored as cookie `access_token`.
- **Registration:** Gated behind invite codes — users must have a valid invite to sign up.
- **Database:** TypeORM with `synchronize: true` (dev only). Entities live in `*/entities/*.entity.ts`.
- **Config:** `@nestjs/config` globally registered; env vars loaded from `backend/.env`.
- **CORS:** Configured for `http://localhost:3000`.

### Frontend (Next.js App Router)
- **Route protection:** `frontend/proxy.ts` middleware intercepts requests to `/dashboard/*` and verifies JWT via `jose`.
- **API calls:** All HTTP requests go through `frontend/lib/api.ts` (`apiFetch`), which reads the `access_token` cookie and injects `Authorization: Bearer` header.
- **Components:** Reusable UI primitives in `components/ui/`; feature components in `components/dashboard/`.
- **Styling:** Tailwind utility classes + CSS custom properties for theming (defined in `app/globals.css`).

### Authentication Flow
1. `POST /auth/login` → JWT returned, stored as `access_token` cookie
2. Frontend middleware checks cookie on every `/dashboard` request
3. Protected API routes use `JwtAuthGuard` (`@UseGuards(JwtAuthGuard)`)

## Environment Variables

**`backend/.env`**
```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=root
DB_PASS=secret
DB_NAME=ascentdb
PORT=8000
JWT_SECRET=<secret>
RESEND_API_KEY=<key>
WEBSITE_URL=http://localhost:3000
ANTHROPIC_API_KEY=<key>      # Advisor; optional (mock replies without it)
ADVISOR_MODEL=claude-sonnet-5-5  # optional override
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
JWT_SECRET=<same as backend>
```

## Key Conventions

- Never use `localStorage` or `sessionStorage` — persist state to the database via the API.
- Only use `GET` and `POST` HTTP methods — never `PATCH`, `PUT`, or `DELETE`. Model all mutations as POST endpoints (e.g. `POST /tasks/:id/update`, `POST /tasks/:id/delete`).
- Backend DTOs use `class-validator` decorators for request validation.
- TypeORM entities define both DB schema and TypeScript types — keep them in sync.
- `synchronize: true` is dev-only; never enable in production.
- Frontend pages are server components by default; add `"use client"` only when hooks/interactivity are needed.
- Invite codes must exist (and be unused) before a new user can register.
