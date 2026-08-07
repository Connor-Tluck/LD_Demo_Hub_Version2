# SE Demo Hub

_A shared catalog of the demos and internal tools SEs build — discover what exists, reuse it, and stop rebuilding from scratch._

## Why this exists

Solution Engineers across the team constantly build custom demos and internal tools. They're valuable and reusable in principle, but in practice they're scattered: personal GitHub accounts, no shared discovery, no visibility into what gets used. The result is duplicated effort and demos that quietly rot.

**Phase 1** centralizes metadata and links in one place with a web app for browsing, analytics, and submissions — without forcing anyone to move their code.

## The web app

**[SE Demo Hub](https://github.com/Connor-Tluck/LD_Demo_Hub_Version2)** — browse demos in grid or list view, see usage analytics, and submit new content.

| Page | What it does |
|---|---|
| **Browse** | Search, filter by tags/category, sort by views/likes/newest. Grid and sidebar list views. |
| **Analytics** | Team-wide usage: top demos, views, contributors, category breakdown. |
| **Add content** | Submit via GitHub repo link or file upload. An agent opens a PR to the central repo. |

Each entry includes: title, description, **customer** (if relevant), **tags**, **tech stack**, LaunchDarkly flags, and a link to the code.

## What's in the repo

| Path | Contents |
|---|---|
| `catalog/` | JSON metadata for every demo and internal tool |
| `demos/` | Project files uploaded through the hub (via PR) |
| `app/` | The gallery web app (React UI + API server) |

Submissions open a **pull request** — merging publishes the entry. Nothing goes live without review.

## Add your demo

**Option 1 — Web app (recommended):** open the hub → **Add content** → fill in metadata → link your GitHub repo or upload files → submit. A PR opens automatically.

**Option 2 — GitHub issue:** use the [submission form](https://github.com/Connor-Tluck/LD_Demo_Hub_Version2/issues/new?template=submission) in the repo.

**Option 3 — Quick ping:** drop a link in **#se-demo-hub** with a one-line description.

For each submission it helps to include:
- What the demo does (one line + longer description if needed)
- Customer name (if customer-specific)
- Framework / languages
- LaunchDarkly project and flag keys (if applicable)

## Phase 2 (future)

On-demand hosted instances, auto-expiry, and deeper LaunchDarkly integration — building on Demo Engineering's `launchdarklydemos.com` platform where possible.

## Questions / ideas

Ping **#se-demo-hub** or Connor Tluck.
