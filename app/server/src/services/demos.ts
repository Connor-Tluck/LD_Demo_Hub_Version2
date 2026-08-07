import type { Db } from '../db/index.js';
import type { CatalogDemo } from '../catalog/schema.js';
import type { CatalogService } from '../catalog/loader.js';
import type { Demo, DemoStatus } from '../types.js';

// Merges the three places a demo's state lives:
//   catalog (git)      → identity, metadata, flag defaults
//   submissions (db)   → demos whose PR hasn't merged yet ('pending')
//   engagement (db)    → views, likes, liked-by-me
// into the single Demo shape the frontend consumes.

export interface ListQuery {
  search?: string;
  tags?: string[];
  category?: string;
  hasFlags?: boolean;
  sort?: 'views' | 'likes' | 'newest';
  page?: number;
  pageSize?: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

export class DemoService {
  constructor(
    private db: Db,
    private catalog: CatalogService,
  ) {}

  // ── Assembly ─────────────────────────────────────────────────────────

  private toDemo(cd: CatalogDemo, status: DemoStatus, userId: string): Demo {
    const stats = this.db
      .prepare('SELECT view_count, seed_likes FROM demo_stats WHERE demo_id = ?')
      .get(cd.id) as { view_count: number; seed_likes: number } | undefined;
    const likeRows = this.db.prepare('SELECT COUNT(*) AS n FROM likes WHERE demo_id = ?').get(cd.id) as { n: number };
    const liked = this.db
      .prepare('SELECT 1 AS x FROM likes WHERE demo_id = ? AND user_id = ?')
      .get(cd.id, userId) as { x: number } | undefined;

    const repoBase = `https://github.com/${cd.repo.owner}/${cd.repo.name}`;
    return {
      id: cd.id,
      slug: cd.id,
      title: cd.title,
      mono: cd.mono,
      gradient: cd.gradient,
      description: cd.description,
      longDescription: cd.longDescription,
      tags: cd.tags,
      customer: cd.customer ?? null,
      category: cd.category,
      techStack: cd.techStack,
      author: { ...cd.author, initials: initials(cd.author.name) },
      createdAt: cd.createdAt,
      updatedAt: cd.updatedAt,
      status,
      repo: {
        owner: cd.repo.owner,
        name: cd.repo.name,
        path: cd.repo.path,
        branch: cd.repo.branch,
        htmlUrl: cd.repo.path ? `${repoBase}/tree/${cd.repo.branch}/${cd.repo.path}` : repoBase,
        cloneUrl: `${repoBase}.git`,
        forkUrl: `${repoBase}/fork`,
      },
      liveDemoUrl: cd.liveDemoUrl,
      launchDarkly: cd.launchDarkly
        ? {
            projectKey: cd.launchDarkly.projectKey,
            environmentKey: cd.launchDarkly.environmentKey,
            flags: cd.launchDarkly.flags,
          }
        : null,
      metrics: {
        viewCount: stats?.view_count ?? 0,
        likeCount: (stats?.seed_likes ?? 0) + likeRows.n,
      },
      likedByCurrentUser: !!liked,
    };
  }

  /** All demos: published from catalog + pending from unmerged submissions. */
  async all(userId: string): Promise<Demo[]> {
    const snap = await this.catalog.get();
    const catalogIds = new Set(snap.demos.map((d) => d.id));
    const demos = snap.demos.map((cd) => this.toDemo(cd, cd.status === 'draft' ? 'draft' : 'published', userId));

    const pendingRows = this.db
      .prepare(`SELECT payload_json FROM submissions WHERE status = 'pending'`)
      .all() as Array<{ payload_json: string }>;
    for (const row of pendingRows) {
      const cd = JSON.parse(row.payload_json) as CatalogDemo;
      // If the file already merged into the catalog, the catalog copy wins.
      if (catalogIds.has(cd.id)) continue;
      demos.push(this.toDemo(cd, 'pending', userId));
    }
    return demos;
  }

  async byId(id: string, userId: string): Promise<Demo | null> {
    const demos = await this.all(userId);
    return demos.find((d) => d.id === id) ?? null;
  }

  /** Raw catalog document (needed by the LD service for flag defaults). */
  async catalogDoc(id: string): Promise<CatalogDemo | null> {
    const snap = await this.catalog.get();
    const fromCatalog = snap.demos.find((d) => d.id === id);
    if (fromCatalog) return fromCatalog;
    const row = this.db
      .prepare(`SELECT payload_json FROM submissions WHERE demo_id = ? AND status = 'pending'`)
      .get(id) as { payload_json: string } | undefined;
    return row ? (JSON.parse(row.payload_json) as CatalogDemo) : null;
  }

  async isPending(id: string): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT 1 AS x FROM submissions WHERE demo_id = ? AND status = 'pending'`)
      .get(id) as { x: number } | undefined;
    if (!row) return false;
    const snap = await this.catalog.get();
    return !snap.demos.some((d) => d.id === id);
  }

  // ── Query (mirrors the frontend's client-side filtering so moving it
  //    server-side later is contract-compatible) ─────────────────────────

  async list(query: ListQuery, userId: string): Promise<{ demos: Demo[]; total: number }> {
    let list = (await this.all(userId)).filter((d) => d.status !== 'draft');

    const q = query.search?.trim().toLowerCase();
    if (q) {
      list = list.filter((d) =>
        [d.title, d.description, d.customer ?? '', d.tags.join(' '), d.techStack.join(' '), d.category]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    if (query.tags?.length) {
      list = list.filter((d) => query.tags!.every((t) => d.tags.includes(t)));
    }
    if (query.category && query.category !== 'All') {
      list = list.filter((d) => d.category === query.category);
    }
    if (query.hasFlags) {
      list = list.filter((d) => (d.launchDarkly?.flags.length ?? 0) > 0);
    }

    const sort = query.sort ?? 'views';
    if (sort === 'views') list.sort((a, b) => b.metrics.viewCount - a.metrics.viewCount);
    else if (sort === 'likes') list.sort((a, b) => b.metrics.likeCount - a.metrics.likeCount);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = list.length;
    const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    return { demos: list.slice((page - 1) * pageSize, page * pageSize), total };
  }

  // ── Engagement ───────────────────────────────────────────────────────

  toggleLike(demoId: string, userId: string): { likeCount: number; likedByCurrentUser: boolean } {
    const existing = this.db
      .prepare('SELECT 1 AS x FROM likes WHERE demo_id = ? AND user_id = ?')
      .get(demoId, userId) as { x: number } | undefined;
    if (existing) {
      this.db.prepare('DELETE FROM likes WHERE demo_id = ? AND user_id = ?').run(demoId, userId);
    } else {
      this.db.prepare('INSERT INTO likes (user_id, demo_id) VALUES (?, ?)').run(userId, demoId);
      this.recordEvent(demoId, userId, 'like');
    }
    const stats = this.db.prepare('SELECT seed_likes FROM demo_stats WHERE demo_id = ?').get(demoId) as
      | { seed_likes: number }
      | undefined;
    const n = (this.db.prepare('SELECT COUNT(*) AS n FROM likes WHERE demo_id = ?').get(demoId) as { n: number }).n;
    return { likeCount: (stats?.seed_likes ?? 0) + n, likedByCurrentUser: !existing };
  }

  recordView(demoId: string, userId: string, context: 'detail' | 'split'): { viewCount: number } {
    this.db
      .prepare(
        `INSERT INTO demo_stats (demo_id, view_count) VALUES (?, 1)
         ON CONFLICT(demo_id) DO UPDATE SET view_count = view_count + 1`,
      )
      .run(demoId);
    this.recordEvent(demoId, userId, context === 'split' ? 'split' : 'view');
    const row = this.db.prepare('SELECT view_count FROM demo_stats WHERE demo_id = ?').get(demoId) as {
      view_count: number;
    };
    return { viewCount: row.view_count };
  }

  recordEvent(demoId: string, userId: string, type: string): void {
    this.db.prepare('INSERT INTO events (demo_id, user_id, type) VALUES (?, ?, ?)').run(demoId, userId, type);
  }
}
