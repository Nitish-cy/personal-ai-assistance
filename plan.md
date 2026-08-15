# Project plan

Evolving from a personal CLI calendar assistant into a multi-user AI Calendar Assistant SaaS.

## Done

- [x] Phase 1 - CLI agent extracted into a reusable LangGraph service (`src/modules/agent/`)
- [x] Phase 2 - Backend API wrapping the agent (`POST /api/agent/chat`)
- [x] Phase 3 - Authentication (email/password signup/login, server-side sessions)
- [x] Phase 4 - Per-user Google OAuth (encrypted tokens in `oauth_account`, replacing the single `.env`-based account)
- [x] Phase 5 - PostgreSQL persistence via TypeORM migrations (replacing `synchronize: true`)

## Next

- [ ] Phase 6 - Next.js dashboard
- [ ] Phase 7 - AI chat UI
- [ ] Phase 8 - Calendar UI
- [ ] Later phases: smart scheduling, conversation memory persistence, observability, CI/CD, deployment infra

See `.env.example` for required configuration.
