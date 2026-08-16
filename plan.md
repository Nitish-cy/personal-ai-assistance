# Project plan

Evolving from a personal CLI calendar assistant into a multi-user AI Calendar Assistant SaaS.

## Done

- [x] Phase 1 - CLI agent extracted into a reusable LangGraph service (`src/modules/agent/`)
- [x] Phase 2 - Backend API wrapping the agent (`POST /api/agent/chat`)
- [x] Phase 3 - Authentication (email/password signup/login, server-side sessions)
- [x] Phase 4 - Per-user Google OAuth (encrypted tokens in `oauth_account`, replacing the single `.env`-based account)
- [x] Phase 5 - PostgreSQL persistence via TypeORM migrations (replacing `synchronize: true`)
- [x] Phase 6 - Next.js dashboard (`web/`, BFF proxy via `next.config.ts` rewrites)
- [x] Phase 7 - AI chat UI (`/assistant`)
- [x] Phase 8 - Calendar UI (`/calendar`, FullCalendar month/week/day, CRUD, drag-drop, recurrence, colors)
- [x] Phase 9 - Agent confirmations (`update-event`/`delete-event` tools + system-prompt policy: find the event, confirm, only then act)
- [x] Phase 10 - Smart scheduling (`find-free-slots` tool, conflict detection built into `create-event`)
- [x] Phase 11 - Conversation memory persistence (`PostgresSaver` replacing in-memory `MemorySaver` - survives server restarts)
- [x] Phase 12 - Notifications/reminders (in-app only: `reminder` table, `create-reminder` tool, `/api/notifications`, dashboard polling banner)
- [x] Phase 13 - Observability (`pino` structured logs with cookie/password redaction, per-agent-run tracking, Prometheus `/metrics`)
- [x] Phase 14 - Testing (`src/integration/*.integration.test.ts` against real Postgres via `npm run test:integration`, kept separate from the fast offline `npm test` unit suite)
- [x] Phase 15 - Docker + CI/CD (multi-stage Dockerfiles for both services, full `docker-compose.yml` stack, GitHub Actions CI on every PR + image publish to GHCR on merge to `main`)

## Next
- [ ] Actual AWS deployment (ECS/Fargate task defs, RDS, ALB) - needs a real AWS account/credentials to do meaningfully

See `.env.example` for required configuration.
