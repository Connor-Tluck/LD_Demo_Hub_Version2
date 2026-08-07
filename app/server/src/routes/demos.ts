import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../app.js';

const listQuerySchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  category: z.string().optional(),
  hasFlags: z.enum(['true', 'false']).optional(),
  sort: z.enum(['views', 'likes', 'newest']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

const eventSchema = z.object({
  type: z.enum(['fork', 'clone', 'source', 'split']),
});

export function demoRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/demos', async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', issues: parsed.error.issues });
    const q = parsed.data;
    return ctx.demos.list(
      {
        search: q.search,
        tags: q.tags ? q.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        category: q.category,
        hasFlags: q.hasFlags === 'true',
        sort: q.sort,
        page: q.page,
        pageSize: q.pageSize,
      },
      req.user.id,
    );
  });

  app.get<{ Params: { id: string } }>('/api/demos/:id', async (req, reply) => {
    const demo = await ctx.demos.byId(req.params.id, req.user.id);
    if (!demo) return reply.code(404).send({ error: 'not_found' });
    return demo;
  });

  app.get<{ Params: { id: string } }>('/api/demos/:id/readme', async (req, reply) => {
    const doc = await ctx.demos.catalogDoc(req.params.id);
    if (!doc) return reply.code(404).send({ error: 'not_found' });
    const readme = await ctx.readme.forDemo(doc);
    if (!readme) return reply.code(404).send({ error: 'no_readme' });
    return readme;
  });

  app.post<{ Params: { id: string } }>('/api/demos/:id/like', async (req, reply) => {
    const demo = await ctx.demos.byId(req.params.id, req.user.id);
    if (!demo) return reply.code(404).send({ error: 'not_found' });
    return ctx.demos.toggleLike(req.params.id, req.user.id);
  });

  app.post<{ Params: { id: string } }>('/api/demos/:id/view', async (req, reply) => {
    const demo = await ctx.demos.byId(req.params.id, req.user.id);
    if (!demo) return reply.code(404).send({ error: 'not_found' });
    const body = (req.body ?? {}) as { context?: string };
    return ctx.demos.recordView(req.params.id, req.user.id, body.context === 'split' ? 'split' : 'detail');
  });

  // Engagement beyond views/likes (fork clicks, clone copies, source opens)
  // feeds the dashboard activity stream.
  app.post<{ Params: { id: string } }>('/api/demos/:id/events', async (req, reply) => {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', issues: parsed.error.issues });
    const demo = await ctx.demos.byId(req.params.id, req.user.id);
    if (!demo) return reply.code(404).send({ error: 'not_found' });
    ctx.demos.recordEvent(req.params.id, req.user.id, parsed.data.type);
    return { ok: true };
  });
}
