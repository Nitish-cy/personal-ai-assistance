# AI Calendar Assistant

A multi-tenant, AI-powered calendar management app. Each user connects their own Google Calendar and manages it through natural-language chat (list/create/reschedule/delete events, find free slots, set reminders) or a conventional month/week/day calendar UI.

> Deep technical detail lives in [`TECHNICAL_ARCHITECTURE.md`](TECHNICAL_ARCHITECTURE.md), the full endpoint reference in [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md), diagrams in [`ARCHITECTURE_DIAGRAMS.md`](ARCHITECTURE_DIAGRAMS.md), and interview-ready explanations in [`INTERVIEW_GUIDE.md`](INTERVIEW_GUIDE.md). This README is intentionally short — those are the source of truth.

## Features

- **Conversational assistant** (`/assistant`) — a LangGraph agent with 6 tools: list/search events, create (with automatic conflict detection), update, delete (confirmation-gated), find free slots, and set in-app reminders. ChatGPT-style UI with separate, persisted conversation threads.
- **Calendar UI** (`/calendar`) — FullCalendar month/week/day views, click-to-create, drag-to-reschedule, recurrence presets, event colors.
- **Per-user Google OAuth** — each user connects their own calendar; tokens are encrypted at rest and refreshed automatically.
- **Email/password auth** — bcrypt-hashed passwords, server-side sessions (not JWT).
- **In-app reminders** — polled notification banner on the dashboard.

**Not implemented** (see `TECHNICAL_ARCHITECTURE.md` for the full list): Redis, rate limiting, idempotency keys, recurring events via the agent (Calendar-UI only), real cloud deployment, email/push notification delivery.

## Architecture (at a glance)

```text
Browser → Next.js (BFF proxy) → Express API → requireAuth
                                      ↓
                        LangGraph agent ↔ Groq LLM (openai/gpt-oss-120b)
                                      ↓
                        Calendar tools → Google Calendar API
                                      ↓
                        PostgreSQL (users, sessions, OAuth tokens,
                        conversation metadata + LangGraph's own
                        checkpoint tables, reminders)
```

## Tech Stack

TypeScript, Node.js, Express, Next.js 16 (App Router) + React 19, Tailwind + shadcn/ui, FullCalendar, LangChain + LangGraph, Groq API, PostgreSQL + TypeORM, `@langchain/langgraph-checkpoint-postgres`, `pino` + `prom-client`, Jest + Supertest, Docker, GitHub Actions.

## Setup

Requires Node 22+, Docker (for Postgres), and a Groq API key + Google Cloud OAuth credentials.

```bash
npm install
cd web && npm install && cd ..
cp .env.example .env   # fill in real values
cp web/.env.example web/.env.local
docker compose up -d postgres
npm run migration:run
```

### Environment Variables

See [`.env.example`](.env.example) for the backend and [`web/.env.example`](web/.env.example) for the frontend. Required: `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URL`, `FRONTEND_URL`, `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` (32 bytes, base64). `LOG_LEVEL` is optional.

## Running Locally

```bash
npm run server      # backend, http://localhost:3600
cd web && npm run dev  # frontend, http://localhost:3000
```

Or the full containerized stack:
```bash
docker compose up -d
```

The CLI entry point (single-user, `.env`-based Google account, no auth) still works too: `npm run dev`.

## Testing

```bash
npm test               # fast, offline unit tests (no DB/network)
npm run test:integration  # real Postgres required (docker compose up -d postgres)
cd web && npm run lint && npm run typecheck
```

## API

Full reference in [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md). Summary: `/api/auth/*` (signup/login/logout), `/api/me`, `/auth` + `/callback` (Google OAuth redirect), `/api/calendar/*` (status + event CRUD), `/api/agent/*` (chat + conversations), `/api/notifications`, `/metrics` (Prometheus, currently unauthenticated).

## Agent Architecture

A two-node LangGraph loop (`assistant` ↔ `tools`), state = `{messages}` (LangGraph's built-in `MessagesAnnotation`), persisted per-conversation via `PostgresSaver` — conversations survive server restarts. Full breakdown, including the honest gaps (confirmation is prompt-enforced, not graph-enforced; no recurrence support in the agent's tools) in `TECHNICAL_ARCHITECTURE.md` §6-9.

## Screenshots

_(placeholder — add screenshots of `/dashboard`, `/assistant`, and `/calendar` here)_

## Deployment

Docker Compose (`docker-compose.yml`) runs Postgres + backend + frontend together locally — verified working end-to-end. GitHub Actions (`.github/workflows/ci.yml`) runs tests on every PR and publishes images to GitHub Container Registry on merge to `main`. **No real cloud deployment exists yet** — the images are portable and ECS/Fargate-ready, but provisioning real AWS infrastructure needs real AWS credentials that aren't part of this repo.

## Future Improvements

See `INTERVIEW_GUIDE.md` §7 for the full near-term/medium-term/long-term roadmap (Redis-backed OAuth state for multi-instance scaling, rate limiting, idempotency keys, `interrupt()`-based confirmation, multi-attendee availability, real cloud deployment).
