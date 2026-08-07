import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { LdApiError } from '../services/launchdarkly.js';

const setValueSchema = z.object({ value: z.unknown() });

export function flagRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Pending demos have no provisioned environment yet — the frontend shows
  // its "environment isn't provisioned" error state on this 409.
  async function loadDemoOr409(id: string) {
    const doc = await ctx.demos.catalogDoc(id);
    if (!doc) return { error: 404 as const };
    if (await ctx.demos.isPending(id)) return { error: 409 as const };
    return { doc };
  }

  app.get<{ Params: { id: string } }>('/api/demos/:id/flags', async (req, reply) => {
    const res = await loadDemoOr409(req.params.id);
    if (res.error === 404) return reply.code(404).send({ error: 'not_found' });
    if (res.error === 409)
      return reply
        .code(409)
        .send({ error: 'environment_not_provisioned', message: 'This demo is pending — its PR has not merged yet.' });
    try {
      return await ctx.launchDarkly.getFlags(res.doc);
    } catch (err) {
      if (err instanceof LdApiError) return reply.code(502).send({ error: 'launchdarkly_error', message: err.message });
      throw err;
    }
  });

  app.post<{ Params: { id: string; key: string } }>('/api/demos/:id/flags/:key', async (req, reply) => {
    const parsed = setValueSchema.safeParse(req.body);
    if (!parsed.success || !('value' in (req.body as object)))
      return reply.code(400).send({ error: 'bad_request', message: 'body must be { value }' });
    const res = await loadDemoOr409(req.params.id);
    if (res.error === 404) return reply.code(404).send({ error: 'not_found' });
    if (res.error === 409)
      return reply.code(409).send({ error: 'environment_not_provisioned' });
    try {
      return await ctx.launchDarkly.setFlagValue(res.doc, req.params.key, parsed.data.value);
    } catch (err) {
      if (err instanceof LdApiError) {
        const code = err.status === 404 || err.status === 400 ? err.status : 502;
        return reply.code(code).send({ error: 'flag_update_failed', message: err.message });
      }
      throw err;
    }
  });

  // ── Environment lifecycle ────────────────────────────────────────────

  app.post<{ Params: { id: string } }>('/api/demos/:id/environment/provision', async (req, reply) => {
    const doc = await ctx.demos.catalogDoc(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not_found' });
    try {
      return await ctx.launchDarkly.provisionEnvironment(doc);
    } catch (err) {
      if (err instanceof LdApiError) return reply.code(502).send({ error: 'provision_failed', message: err.message });
      throw err;
    }
  });

  app.post<{ Params: { id: string } }>('/api/demos/:id/environment/reset', async (req, reply) => {
    const doc = await ctx.demos.catalogDoc(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not_found' });
    try {
      const flags = await ctx.launchDarkly.resetEnvironment(doc);
      return { reset: true, flags };
    } catch (err) {
      if (err instanceof LdApiError) return reply.code(502).send({ error: 'reset_failed', message: err.message });
      throw err;
    }
  });
}
