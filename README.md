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

---

# Catalog

<!-- CATALOG:START -->
_18 item(s). Auto-generated from `catalog/` — do not edit by hand._

**Demos: 10 · Internal Tools: 8 · AI Workflows: 0 · Integrations: 0**

### Demos (10)

| Name | Owner | Customer-specific | Language(s) | LD features | Description |
| --- | --- | --- | --- | --- | --- |
| [demo-deere](https://github.com/areafans/demo-deere) | Jason Clark | Yes |  | Feature Flags, Experimentation, Code Control | Customer custom demo for John Deere. |
| [demo-hyatt](https://github.com/areafans/demo-hyatt) | Jason Clark | Yes |  | Feature Flags, Experimentation, Observability, Code Control | Customer custom demo for Hyatt. |
| [demo-ptc](https://github.com/areafans/demo-ptc) | Jason Clark | Yes |  | Feature Flags, Observability | Customer custom demo for PTC. |
| [demo-sherwin](https://github.com/areafans/demo-sherwin) | Jason Clark | Yes |  | Feature Flags, Experimentation, Observability | Customer custom demo for Sherwin-Williams. |
| [demo-solidcore](https://github.com/areafans/demo-solidcore) | Jason Clark | Yes |  | Feature Flags, Observability | Customer custom demo for Solidcore. |
| [demo-solidcore-pov](https://github.com/areafans/demo-solidcore-pov) | Jason Clark | Yes |  | Feature Flags, Observability | POV (proof-of-value) variant for Solidcore. |
| [Hospitality App Demo](https://github.com/Connor-Tluck/LD_Hospitality_Demo) | Connor Tluck | Yes | Swift, iOS | Feature Flags, Experimentation, Observability, Agent Control | Custom iOS app demo for a hospitality customer. |
| [Prerequisite Flag Orchestration](https://github.com/Connor-Tluck/Pre-Requisite-Flag-Demo) | Connor Tluck | No | Node.js, Express, D3.js, LD Node Server SDK | Observability | Interactive D3 dependency graph — toggle a flag and watch prerequisite dependencies cascade across a multi-team checkout release. |
| [Release Runner](https://github.com/Connor-Tluck/ld-release-runner) | Connor Tluck | No | Node.js, JavaScript, WebSocket, LD Node Server SDK | Experimentation | Synthetic flag evaluations and metric events that drive real guarded release decisions — demo a healthy rollout or force an auto-rollback on demand. |
| [test](https://github.com/Connor-Tluck/Job_Tracker_LaunchDarkly) | Connor Tluck | No |  |  | test |

### Internal Tools (8)

| Name | Owner | Customer-specific | Language(s) | LD features | Description |
| --- | --- | --- | --- | --- | --- |
| [Basica Demo App (Job Tracker)](https://github.com/Connor-Tluck/Job_Tracker_LaunchDarkly) | Connor Tluck | No |  | Feature Flags, Experimentation, Observability, Agent Control | Custom demo showing a job tracker. |
| Brand & Assets |  | No |  |  | Logos, templates, and approved talk tracks. |
| Claude Skills Repo |  | No |  |  | Reusable agent skills & prompts for the SE team. |
| Component Library |  | No |  |  | Shared design system and UI kit for demos. |
| [LD Content Generator](https://github.com/Connor-Tluck/LD-Content_Generator) | Connor Tluck | No |  |  | Front-end app tied to an LD skill to generate and edit presentations. |
| Presentation Generator |  | No |  |  | Turn any demo into a customer-ready deck in seconds. |
| Runbook Hub |  | No |  |  | Demo scripts, incident runbooks, and playbooks. |
| Sandbox Provisioner |  | No |  |  | Spin up isolated demo environments on demand. |

### AI Workflows (0)

| Name | Owner | Customer-specific | Language(s) | LD features | Description |
| --- | --- | --- | --- | --- | --- |
| _nothing here yet_ |  |  |  |  |  |

### Integrations (0)

| Name | Owner | Customer-specific | Language(s) | LD features | Description |
| --- | --- | --- | --- | --- | --- |
| _nothing here yet_ |  |  |  |  |  |

## Browse by LD feature

- **Agent Control** — Basica Demo App (Job Tracker), Hospitality App Demo
- **Code Control** — demo-deere, demo-hyatt
- **Experimentation** — Basica Demo App (Job Tracker), Hospitality App Demo, Release Runner, demo-deere, demo-hyatt, demo-sherwin
- **Feature Flags** — Basica Demo App (Job Tracker), Hospitality App Demo, demo-deere, demo-hyatt, demo-ptc, demo-sherwin, demo-solidcore, demo-solidcore-pov
- **Observability** — Basica Demo App (Job Tracker), Hospitality App Demo, Prerequisite Flag Orchestration, demo-hyatt, demo-ptc, demo-sherwin, demo-solidcore, demo-solidcore-pov

## Browse by language

- **D3.js** — Prerequisite Flag Orchestration
- **Express** — Prerequisite Flag Orchestration
- **iOS** — Hospitality App Demo
- **JavaScript** — Release Runner
- **LD Node Server SDK** — Prerequisite Flag Orchestration, Release Runner
- **Node.js** — Prerequisite Flag Orchestration, Release Runner
- **Swift** — Hospitality App Demo
- **WebSocket** — Release Runner

## Browse by tag

- **d3.js** — Prerequisite Flag Orchestration
- **dependency-graph** — Prerequisite Flag Orchestration
- **guarded-releases** — Release Runner
- **metrics** — Release Runner
- **node.js** — Prerequisite Flag Orchestration, Release Runner
- **prerequisites** — Prerequisite Flag Orchestration
- **progressive-delivery** — Release Runner
- **release-orchestration** — Prerequisite Flag Orchestration
- **server-sdk** — Release Runner
- **traffic-simulation** — Release Runner
- **visualization** — Prerequisite Flag Orchestration
<!-- CATALOG:END -->
