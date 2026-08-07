import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { loadConfig, type AppConfig } from './config.js';
import { openDb, type Db } from './db/index.js';
import { buildCatalogService, CatalogService } from './catalog/loader.js';
import { registerAuth } from './auth/plugin.js';
import { DemoService } from './services/demos.js';
import { StatsService } from './services/stats.js';
import { LaunchDarklyService } from './services/launchdarkly.js';
import { GitHubService } from './services/github.js';
import { ReadmeService } from './services/readme.js';
import { demoRoutes } from './routes/demos.js';
import { flagRoutes } from './routes/flags.js';
import { submissionRoutes } from './routes/submissions.js';
import { webhookRoutes } from './routes/webhooks.js';
import { miscRoutes } from './routes/misc.js';

export interface AppContext {
  config: AppConfig;
  db: Db;
  catalog: CatalogService;
  demos: DemoService;
  stats: StatsService;
  launchDarkly: LaunchDarklyService;
  github: GitHubService;
  readme: ReadmeService;
}

export function buildContext(overrides: Partial<AppConfig> = {}): AppContext {
  const config = loadConfig(overrides);
  const db = openDb(config.databasePath);
  const catalog = buildCatalogService(config);
  const demos = new DemoService(db, catalog);
  const repoRoot = path.resolve(config.catalog.dir, '..');
  return {
    config,
    db,
    catalog,
    demos,
    stats: new StatsService(db, demos),
    launchDarkly: new LaunchDarklyService(config.launchDarkly, db),
    github: new GitHubService(config.github, repoRoot),
    readme: new ReadmeService(config.github, repoRoot),
  };
}

export async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(cors, {
    origin: ctx.config.corsOrigins,
    credentials: true,
  });

  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024, files: 50 },
  });

  registerAuth(app, ctx.db, ctx.config.auth);

  demoRoutes(app, ctx);
  flagRoutes(app, ctx);
  submissionRoutes(app, ctx);
  webhookRoutes(app, ctx);
  miscRoutes(app, ctx);

  // Serve the built frontend (web/dist) with an SPA fallback, so one process
  // hosts both the UI and the API. During UI development, `npm run dev` in
  // web/ proxies /api here instead.
  const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    await app.register(fastifyStatic, { root: webDist });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.method !== 'GET') {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
