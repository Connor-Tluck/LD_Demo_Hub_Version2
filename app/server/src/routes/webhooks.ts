import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../app.js';

// GitHub webhook (pull_request events) — the moment a submission PR merges,
// flip the submission row to merged and refresh the catalog so the demo
// goes pending → published without a redeploy (in CATALOG_SOURCE=github
// mode) or on the next deploy (local mode).
//
// Registered in its own plugin scope with a raw-buffer body parser so the
// HMAC signature verifies against exactly what GitHub sent.

interface PullRequestEvent {
  action?: string;
  pull_request?: { number: number; merged: boolean };
}

export function webhookRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    scope.post('/api/webhooks/github', async (req, reply) => {
      const raw = req.body as Buffer;
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      if (!ctx.github.verifyWebhookSignature(raw, signature)) {
        return reply.code(401).send({ error: 'invalid_signature' });
      }

      const eventName = req.headers['x-github-event'];
      if (eventName !== 'pull_request') return { ok: true, ignored: true };

      let payload: PullRequestEvent;
      try {
        payload = JSON.parse(raw.toString('utf8')) as PullRequestEvent;
      } catch {
        return reply.code(400).send({ error: 'bad_payload' });
      }
      if (payload.action !== 'closed' || !payload.pull_request) return { ok: true, ignored: true };

      const status = payload.pull_request.merged ? 'merged' : 'closed';
      ctx.db
        .prepare(`UPDATE submissions SET status = ?, updated_at = datetime('now') WHERE pr_number = ?`)
        .run(status, payload.pull_request.number);
      if (status === 'merged') await ctx.catalog.refresh();
      return { ok: true, status };
    });
  });
}
