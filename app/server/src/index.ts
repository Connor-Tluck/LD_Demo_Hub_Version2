import { buildApp, buildContext } from './app.js';

const ctx = buildContext();
const app = await buildApp(ctx);

try {
  await app.listen({ port: ctx.config.port, host: ctx.config.host });
  const snap = await ctx.catalog.get();
  app.log.info(
    {
      catalogDemos: snap.demos.length,
      catalogErrors: snap.errors,
      launchDarkly: ctx.launchDarkly.liveMode ? 'live' : 'demo-mode',
      github: ctx.github.liveMode ? 'live' : 'demo-mode',
    },
    'demo gallery backend up',
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
