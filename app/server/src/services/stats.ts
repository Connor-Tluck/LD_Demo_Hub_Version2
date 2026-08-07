import type { Db } from '../db/index.js';
import type { DemoService } from './demos.js';
import type { ActivityItem, ActivityVerb, DashboardStats, Demo } from '../types.js';

// Aggregations behind the analytics dashboard and the home-page stat strip.
// Everything derives from the merged demo list + the events table; there is
// no separate analytics store to keep in sync.

const VERB_BY_EVENT: Record<string, ActivityVerb> = {
  view: 'viewed',
  split: 'opened split view on',
  like: 'liked',
  fork: 'forked',
  clone: 'cloned',
  source: 'viewed',
  submit: 'submitted',
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
}

export class StatsService {
  constructor(
    private db: Db,
    private demos: DemoService,
  ) {}

  async dashboard(userId: string): Promise<DashboardStats> {
    const all = (await this.demos.all(userId)).filter((d) => d.status !== 'draft');
    const totalViews = all.reduce((a, d) => a + d.metrics.viewCount, 0);
    const totalLikes = all.reduce((a, d) => a + d.metrics.likeCount, 0);
    const flagged = all.filter((d) => (d.launchDarkly?.flags.length ?? 0) > 0);

    const categories = new Map<string, { count: number; views: number }>();
    const tech = new Map<string, number>();
    const contributors = new Map<string, { color: string; demos: number; views: number; likes: number }>();
    for (const d of all) {
      const c = categories.get(d.category) ?? { count: 0, views: 0 };
      c.count += 1;
      c.views += d.metrics.viewCount;
      categories.set(d.category, c);
      for (const t of d.techStack) tech.set(t, (tech.get(t) ?? 0) + 1);
      const a = contributors.get(d.author.name) ?? { color: d.author.avatarColor, demos: 0, views: 0, likes: 0 };
      a.demos += 1;
      a.views += d.metrics.viewCount;
      a.likes += d.metrics.likeCount;
      contributors.set(d.author.name, a);
    }

    return {
      totalDemos: all.length,
      published: all.filter((d) => d.status === 'published').length,
      pending: all.filter((d) => d.status === 'pending').length,
      totalViews,
      totalLikes,
      avgViews: all.length ? Math.round(totalViews / all.length) : 0,
      flaggedCount: flagged.length,
      totalFlags: flagged.reduce((a, d) => a + (d.launchDarkly?.flags.length ?? 0), 0),
      flagPct: all.length ? Math.round((flagged.length / all.length) * 100) : 0,
      contributors: contributors.size,
      topDemos: [...all]
        .sort((a, b) => b.metrics.viewCount - a.metrics.viewCount)
        .slice(0, 5)
        .map((d) => ({ id: d.id, title: d.title, mono: d.mono, gradient: d.gradient, views: d.metrics.viewCount })),
      categories: [...categories.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.views - a.views),
      tech: [...tech.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      topContributors: [...contributors.entries()]
        .map(([name, a]) => ({ name, initials: initials(name), ...a }))
        .sort((a, b) => b.views - a.views),
      activity: this.activity(all, 20),
    };
  }

  activity(all: Demo[], limit: number): ActivityItem[] {
    const titleById = new Map(all.map((d) => [d.id, d.title]));
    const rows = this.db
      .prepare(
        `SELECT e.demo_id, e.type, e.created_at, u.name
         FROM events e JOIN users u ON u.id = e.user_id
         ORDER BY e.id DESC LIMIT ?`,
      )
      .all(limit) as Array<{ demo_id: string; type: string; created_at: string; name: string }>;
    return rows
      .filter((r) => titleById.has(r.demo_id))
      .map((r) => ({
        who: r.name,
        initials: initials(r.name),
        verb: VERB_BY_EVENT[r.type] ?? 'viewed',
        demoId: r.demo_id,
        demoTitle: titleById.get(r.demo_id)!,
        at: r.created_at.endsWith('Z') ? r.created_at : r.created_at.replace(' ', 'T') + 'Z',
      }));
  }
}
