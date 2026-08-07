import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp, buildContext, type AppContext } from '../src/app.js';

// End-to-end contract tests against the real app in demo mode (in-memory
// SQLite, no LD/GitHub tokens), using a snapshot of the LD_Demo_Hub catalog
// kept in test/fixtures so the suite is self-contained.

const catalogDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/catalog');

let app: FastifyInstance;
let ctx: AppContext;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  ctx = buildContext({
    databasePath: ':memory:',
    catalog: { source: 'local', dir: catalogDir, ttlSeconds: 60 },
    launchDarkly: { apiToken: null, baseUrl: 'https://app.launchdarkly.com', projectKey: 'CT-Demo_Hub', environmentKey: 'production' },
    github: { token: null, galleryRepo: 'Connor-Tluck/LD_Demo_Hub', baseBranch: 'main', webhookSecret: 'test-secret' },
  });
  app = await buildApp(ctx);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

const asUser = (email = 'ctluck@launchdarkly.com', name = 'Connor Tluck') => ({
  'x-dev-email': email,
  'x-dev-name': name,
});

describe('catalog + demos', () => {
  it('lists published demos from the catalog', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/demos', headers: asUser() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(6);
    const ids = body.demos.map((d: { id: string }) => d.id);
    expect(ids).toContain('progressive-rollout');
    expect(body.demos.every((d: { status: string }) => d.status === 'published')).toBe(true);
  });

  it('supports search, category, and hasFlags filters', async () => {
    const search = await app.inject({ method: 'GET', url: '/api/demos?search=rollout', headers: asUser() });
    expect(search.json().demos.map((d: { id: string }) => d.id)).toContain('progressive-rollout');

    const cat = await app.inject({ method: 'GET', url: '/api/demos?category=Mobile', headers: asUser() });
    expect(cat.json().total).toBe(1);

    const flagged = await app.inject({ method: 'GET', url: '/api/demos?hasFlags=true', headers: asUser() });
    expect(flagged.json().demos.every((d: { launchDarkly: { flags: unknown[] } | null }) => d.launchDarkly)).toBe(true);
  });

  it('returns a single demo with computed repo URLs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/demos/ab-experiment', headers: asUser() });
    const demo = res.json();
    expect(demo.repo.htmlUrl).toBe('https://github.com/Connor-Tluck/LD_Demo_Hub/tree/main/demos/ab-experiment');
    expect(demo.repo.cloneUrl).toBe('https://github.com/Connor-Tluck/LD_Demo_Hub.git');
    expect(demo.repo.forkUrl).toBe('https://github.com/Connor-Tluck/LD_Demo_Hub/fork');
  });

  it('404s on unknown demos', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/demos/nope', headers: asUser() });
    expect(res.statusCode).toBe(404);
  });
});

describe('engagement', () => {
  it('toggles likes per user', async () => {
    const like = await app.inject({ method: 'POST', url: '/api/demos/kill-switch/like', headers: asUser() });
    expect(like.json()).toMatchObject({ likeCount: 1, likedByCurrentUser: true });

    const other = await app.inject({
      method: 'POST',
      url: '/api/demos/kill-switch/like',
      headers: asUser('pnair@launchdarkly.com', 'Priya Nair'),
    });
    expect(other.json().likeCount).toBe(2);

    const unlike = await app.inject({ method: 'POST', url: '/api/demos/kill-switch/like', headers: asUser() });
    expect(unlike.json()).toMatchObject({ likeCount: 1, likedByCurrentUser: false });
  });

  it('increments views and reflects them in the demo payload', async () => {
    await app.inject({ method: 'POST', url: '/api/demos/mobile-config/view', headers: asUser() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos/mobile-config/view',
      headers: asUser(),
      payload: { context: 'split' },
    });
    expect(res.json().viewCount).toBe(2);

    const demo = await app.inject({ method: 'GET', url: '/api/demos/mobile-config', headers: asUser() });
    expect(demo.json().metrics.viewCount).toBe(2);
  });

  it('records fork/clone events', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos/kill-switch/events',
      headers: asUser(),
      payload: { type: 'fork' },
    });
    expect(res.json()).toEqual({ ok: true });
  });
});

describe('flags (demo mode)', () => {
  it('returns catalog defaults with LD deep links', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/demos/progressive-rollout/flags', headers: asUser() });
    const flags = res.json();
    expect(flags).toHaveLength(4);
    const promo = flags.find((f: { key: string }) => f.key === 'promo-banner');
    expect(promo.currentValue).toBe('holiday');
    expect(promo.launchDarklyUrl).toBe(
      'https://app.launchdarkly.com/projects/CT-Demo_Hub/flags/promo-banner/targeting?env=production&selected-env=production',
    );
    expect(promo.source).toBe('local');
  });

  it('updates a flag value and persists it', async () => {
    const set = await app.inject({
      method: 'POST',
      url: '/api/demos/progressive-rollout/flags/promo-banner',
      headers: asUser(),
      payload: { value: 'vip' },
    });
    expect(set.json().currentValue).toBe('vip');

    const reread = await app.inject({ method: 'GET', url: '/api/demos/progressive-rollout/flags', headers: asUser() });
    expect(reread.json().find((f: { key: string }) => f.key === 'promo-banner').currentValue).toBe('vip');
  });

  it('rejects values that match no variation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos/progressive-rollout/flags/promo-banner',
      headers: asUser(),
      payload: { value: 'nonsense' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('resets the environment to catalog defaults', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos/progressive-rollout/environment/reset',
      headers: asUser(),
    });
    expect(res.json().reset).toBe(true);
    const flags = res.json().flags;
    expect(flags.find((f: { key: string }) => f.key === 'promo-banner').currentValue).toBe('holiday');
  });
});

describe('submissions (demo mode)', () => {
  it('accepts a wizard payload, opens a (fake) PR, and lists the demo as pending', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos',
      headers: asUser(),
      payload: {
        title: 'Edge Personalization',
        description: 'Personalize at the edge with zero origin hits.',
        category: 'Targeting',
        tags: ['edge', 'personalization'],
        techStack: ['Cloudflare Workers'],
        repo: { url: 'https://github.com/ld-demos/edge-personalization' },
        liveDemoUrl: 'https://edge.demos.dev',
        launchDarkly: { projectKey: 'se-demos', environmentKey: 'production', flagKeys: ['edge-rules'] },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('pr_opened');
    expect(body.demoId).toBe('edge-personalization');
    expect(body.prUrl).toContain('/pull/');

    const listed = await app.inject({ method: 'GET', url: '/api/demos/edge-personalization', headers: asUser() });
    expect(listed.json().status).toBe('pending');

    // Pending demos have no provisioned environment → 409 for the flag panel.
    const flags = await app.inject({
      method: 'GET',
      url: '/api/demos/edge-personalization/flags',
      headers: asUser(),
    });
    expect(flags.statusCode).toBe(409);
  });

  it('rejects duplicate slugs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/demos',
      headers: asUser(),
      payload: {
        title: 'Kill Switch', // slugifies to the existing catalog id
        description: 'dup',
        category: 'Reliability',
        repo: { url: 'ld-demos/kill-switch' },
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('dashboard + misc', () => {
  it('aggregates stats and activity', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard', headers: asUser() });
    const dash = res.json();
    expect(dash.totalDemos).toBe(7); // 6 published + 1 pending submission
    expect(dash.pending).toBe(1);
    expect(dash.flagPct).toBeGreaterThan(0);
    expect(dash.topDemos.length).toBeGreaterThan(0);
    expect(dash.activity.length).toBeGreaterThan(0);
    expect(dash.categories.map((c: { name: string }) => c.name)).toContain('Rollouts');
  });

  it('serves the internal tools directory', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tools', headers: asUser() });
    expect(res.json().tools.length).toBe(6);
  });

  it('identifies the current user', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/me', headers: asUser() });
    expect(res.json()).toMatchObject({ email: 'ctluck@launchdarkly.com', name: 'Connor Tluck' });
  });

  it('reports health without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, launchDarkly: 'demo-mode', github: 'demo-mode' });
  });
});

describe('github webhook', () => {
  it('rejects bad signatures and flips submissions on merge', async () => {
    const crypto = await import('node:crypto');
    const payload = JSON.stringify({ action: 'closed', pull_request: { number: 9999, merged: true } });

    const bad = await app.inject({
      method: 'POST',
      url: '/api/webhooks/github',
      headers: { 'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': 'sha256=deadbeef' },
      payload,
    });
    expect(bad.statusCode).toBe(401);

    const sig = 'sha256=' + crypto.createHmac('sha256', 'test-secret').update(payload).digest('hex');
    const good = await app.inject({
      method: 'POST',
      url: '/api/webhooks/github',
      headers: { 'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sig },
      payload,
    });
    expect(good.statusCode).toBe(200);
    expect(good.json()).toMatchObject({ ok: true, status: 'merged' });
  });
});
