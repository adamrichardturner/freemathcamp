# FreeMathCamp

An adaptive, visual maths platform. The first course, **Foundations**, covers everything a learner needs before calculus — 81 connected lessons across 14 units, from place value to the unit circle — with unlimited generated practice and a learning engine that adapts to each learner.

## Highlights

- **Adaptive engine** — struggle scoring (weighted wrong answers, time vs. a baseline, hints, reveals), Bayesian Knowledge Tracing for mastery with forgetting, SM-2 style spaced review, and an in-session difficulty staircase.
- **Queues** — *Review* (due by the spaced schedule), *Strengthen* (topics you've struggled with, plus weak prerequisites to brush up on), *New* (ready-to-learn lessons ranked by prerequisite readiness and how much they unlock), *Keep going*, and an interleaved daily plan.
- **Prerequisite graph** — every lesson lists the ideas it builds on. Prerequisites are advisory, never gates; the course map can show the whole graph.
- **Visual lessons** — KaTeX maths, animated SVG visuals and interactive Mafs explorers (slope, lines, parabolas, transformations, unit circle, systems, Pythagoras…), step-through worked examples.
- **Server-graded practice** — problems are generated from a seed; the API regenerates the exact problem to grade answers, so progress can't be faked from the client.
- **Analytics** — activity heatmap, accuracy and practice trends, mastery by unit, difficulty breakdown, strengths and weak spots.

## Stack

| Area | Tech |
| --- | --- |
| Monorepo | pnpm workspaces, TypeScript everywhere |
| Curriculum | `packages/curriculum` — content, seeded generators, answer checking, prerequisite graph (shared by API and web) |
| API | Node, Express 5, Effect 3, Kysely + Postgres 17, Argon2id, Vitest |
| Web | Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, shadcn/ui (Base UI), TanStack Query, Motion, KaTeX, Mafs, Recharts, React Flow |

```
apps/
  api/            Express + Effect API (clean architecture)
    src/domain/          engine (pure), errors
    src/application/     use cases + ports (repository interfaces)
    src/infrastructure/  Postgres adapters, migrations, security, Google OAuth
    src/http/            Express adapters, validation, middleware
  web/            Next.js app
packages/
  curriculum/     Foundations course content and generators
```

## Getting started

Requirements: Node 22+, pnpm 10, Docker.

```bash
pnpm install
pnpm setup   # creates .env files with generated secrets, starts Postgres, runs migrations
pnpm dev     # API on :4100, web on :3000
```

Open http://localhost:3000. The web app proxies `/api/*` to the API, so cookies stay first-party. `pnpm setup` never overwrites existing env files — back up `.env` and `.env.production`.

### Docker

- **Development:** `pnpm db:up` for just Postgres, or `pnpm docker:dev` to also run the API in a hot-reloading container.
- **Production:** `pnpm docker:prod` runs Postgres on a private network, a one-shot migration job, and a read-only, non-root API container. Put a TLS-terminating proxy (or the Next.js app) in front.

### Google sign-in (optional)

Create an OAuth client (type *Web application*) in Google Cloud Console with the redirect URI `${WEB_ORIGIN}/api/auth/google/callback`, then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The "Continue with Google" button appears automatically once both are set.

## Scripts

Run from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm setup` | First run: create missing env files with generated secrets, start Postgres, migrate |
| `pnpm dev` | API and web in watch mode |
| `pnpm dev:full` | Start Postgres, migrate, then `pnpm dev` |
| `pnpm dev:api` / `pnpm dev:web` | Run one side only |
| `pnpm build` | Production builds of the API and web app |
| `pnpm start` | Run the production builds (`start:api` / `start:web` for one side) |
| `pnpm check` | Typecheck, lint and test everything |
| `pnpm test` | Curriculum fuzz tests, engine unit tests, API integration tests (needs the DB) |
| `pnpm test:engine` / `pnpm test:curriculum` | Fast, database-free test subsets |
| `pnpm db:up` / `pnpm db:down` | Start (and wait for) or stop the dev Postgres |
| `pnpm db:migrate` / `pnpm db:rollback` | Apply / revert migrations |
| `pnpm db:psql` | Open a psql shell on the dev database |
| `pnpm db:reset` | **Delete** the dev database volume, recreate it and migrate |
| `pnpm docker:dev` / `pnpm docker:down` | Postgres + hot-reloading API in Docker |
| `pnpm docker:prod` | Build and start the production stack (uses `.env.production`) |
| `pnpm docker:prod:logs` / `pnpm docker:prod:down` | Follow API logs / stop the production stack |
| `pnpm clean` | Remove build output |

## Security notes

- Argon2id password hashing (OWASP parameters) and timing-equalised login.
- Session tokens are 256-bit random values; only their SHA-256 is stored. Cookies are `HttpOnly`, `SameSite=Lax`, and `__Host-`/`Secure` in production, with sliding expiry.
- CSRF defence: state-changing requests must come from the web origin and carry JSON.
- Rate limiting (global, plus stricter per-IP/email limits on auth), Helmet headers, schema-validated input, no-store API caching.
- Google OAuth uses state + PKCE, requires a verified email, and never silently links to an existing password account.
