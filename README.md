# SE Demo Hub (Version 2)

Central repository for Solution Engineering demos, internal tools, and shared content — plus the web app to browse, analyze usage, and submit new entries.

**Live app:** run locally from `app/` (see below). Link this repo from your Confluence page: [docs/confluence-se-demo-hub.md](docs/confluence-se-demo-hub.md).

## Repository layout

```
catalog/              Demo & tool metadata (JSON) — source of truth for the gallery
demos/                Uploaded demo project files (via PR submissions)
.github/              Intake + validation GitHub Actions
scripts/              Catalog validation & README index generation
app/
  server/             Fastify API + submission agent (opens PRs)
  web/                React UI — grid/list browse, analytics, upload wizard
docs/
  confluence-se-demo-hub.md   Paste-ready Confluence page draft
```

## Quick start (local)

Requires **Node ≥ 22.5** (uses built-in `node:sqlite`).

```bash
# From repo root
cd app/web && npm install && npm run build && cd ../server
npm install
cp ../.env.example .env
npm run dev
```

Open **http://localhost:8787** — UI and API run in one process.

For frontend hot reload during development, also run `npm run dev` in `app/web/` (http://localhost:5173, proxies `/api` to 8787).

### Demo mode (no credentials)

With no tokens configured, the app runs fully locally:

- Catalog loads from `catalog/` in this repo
- Flag panel uses catalog defaults (interactive split view still works)
- Submissions write catalog JSON (+ uploaded files) locally and return a simulated PR link

Set `GET /healthz` to see which integrations are live vs demo mode.

### Going live

Copy `app/.env.example` → `app/server/.env`:

| Variable | Effect |
|---|---|
| `GITHUB_TOKEN` | Submission agent opens real PRs against this repo |
| `LD_API_TOKEN` | Flag panel reads/writes real LaunchDarkly state |
| `GITHUB_WEBHOOK_SECRET` | Auto-publish demos when intake PRs merge |
| `CATALOG_SOURCE=github` | Read catalog via GitHub API (no local checkout needed) |

## Features

- **Browse** — grid view and sidebar list view with search, tags, category, and sort
- **Analytics** — views, likes, top demos, contributors, category breakdown
- **Submit** — wizard to link a GitHub repo **or** upload project files; agent opens a PR
- **Metadata** — title, description, customer (optional), tags, tech stack, LD flags
- **Split view** — run a live demo alongside its LaunchDarkly flags

## Adding content

1. **In-app** — `/add` wizard → `POST /api/demos` or `/api/demos/upload` → PR against `catalog/demos/<slug>.json`
2. **GitHub issue** — use the hub-submission issue form (intake Action opens PR)
3. **By hand** — PR adding `catalog/demos/<slug>.json` yourself

Validate catalog entries: `node scripts/validate-catalog.mjs`

## API

```
GET   /api/demos              List/search demos
GET   /api/demos/:id          Demo detail
POST  /api/demos              Submit (GitHub link) → opens PR
POST  /api/demos/upload       Submit (file upload) → opens PR
GET   /api/dashboard          Usage analytics
GET   /healthz                Integration status
```

See `app/server/src/types.ts` for full shapes.
