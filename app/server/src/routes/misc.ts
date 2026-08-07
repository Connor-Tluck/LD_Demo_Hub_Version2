import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';

export function miscRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/me', async (req) => req.user);

  // Frontend bootstrap config (wizard defaults, repo identity, filter chips).
  app.get('/api/config', async (req) => {
    const demos = await ctx.demos.all(req.user.id);
    return {
      ldProjectKey: ctx.config.launchDarkly.projectKey,
      ldEnvironmentKey: ctx.config.launchDarkly.environmentKey,
      galleryRepo: ctx.config.github.galleryRepo,
      categories: [...new Set(demos.map((d) => d.category))].sort(),
    };
  });

  // Internal-tools directory on the home page (catalog/tools.json).
  app.get('/api/tools', async () => {
    const snap = await ctx.catalog.get();
    return { tools: snap.tools };
  });

  // Home hero strip + full analytics dashboard share one aggregate.
  app.get('/api/dashboard', async (req) => ctx.stats.dashboard(req.user.id));

  // Manual catalog reload (e.g. after a deploy hook pulls the repo).
  app.post('/api/catalog/refresh', async () => {
    const snap = await ctx.catalog.refresh();
    return { loadedAt: snap.loadedAt, demos: snap.demos.length, errors: snap.errors };
  });

  app.get('/healthz', async () => {
    const snap = await ctx.catalog.get();
    return {
      ok: true,
      catalog: { demos: snap.demos.length, errors: snap.errors.length, loadedAt: snap.loadedAt },
      launchDarkly: ctx.launchDarkly.liveMode ? 'live' : 'demo-mode',
      github: ctx.github.liveMode ? 'live' : 'demo-mode',
    };
  });
}
