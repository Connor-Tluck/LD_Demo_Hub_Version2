import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Engagement + submission state lives in SQLite (node:sqlite, no native deps).
// The demo catalog itself lives in git — this DB only holds what can't be
// expressed as code review: likes, views, the activity feed, submissions
// awaiting PR merge, and demo-mode flag overrides.
//
// Swapping to Postgres later is a data-layer-only change: everything below
// is plain SQL behind small typed helpers.

export type Db = DatabaseSync;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'se',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS likes (
  user_id     TEXT NOT NULL REFERENCES users(id),
  demo_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, demo_id)
);

-- Fast counters. seed_* columns let historical/imported numbers coexist with
-- organically tracked ones (likeCount = seed_likes + COUNT(likes)).
CREATE TABLE IF NOT EXISTS demo_stats (
  demo_id     TEXT PRIMARY KEY,
  view_count  INTEGER NOT NULL DEFAULT 0,
  seed_likes  INTEGER NOT NULL DEFAULT 0
);

-- Append-only event log powering the dashboard activity feed and any future
-- analytics. type: view | split | like | fork | clone | source | submit
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  demo_id     TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_demo ON events(demo_id);

-- A submission is a demo whose PR hasn't merged yet. payload_json holds the
-- full catalog document that the PR adds; until merge, the gallery renders
-- it as a 'pending' demo straight from this row.
CREATE TABLE IF NOT EXISTS submissions (
  id           TEXT PRIMARY KEY,
  demo_id      TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  pr_number    INTEGER,
  pr_url       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | merged | closed
  submitted_by TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Demo-mode flag state (used only when no LD_API_TOKEN is configured) so the
-- split view is fully interactive without credentials.
CREATE TABLE IF NOT EXISTS flag_overrides (
  demo_id     TEXT NOT NULL,
  flag_key    TEXT NOT NULL,
  value_json  TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (demo_id, flag_key)
);
`;

export function openDb(databasePath: string): Db {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}
