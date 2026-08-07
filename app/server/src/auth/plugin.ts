import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import type { Db } from '../db/index.js';
import type { AppConfig } from '../config.js';
import type { User } from '../types.js';

// Identity strategy: this is an internal tool, so the app never handles
// credentials itself.
//
//   dev   → x-dev-email / x-dev-name headers (or configured defaults).
//   proxy → an SSO proxy (oauth2-proxy + Okta, Cloudflare Access, GCP IAP…)
//           terminates auth and forwards identity headers. The app trusts
//           them because it is only reachable through the proxy.
//
// Every authenticated request upserts the user row, so likes/events always
// have a real user to attribute to.

declare module 'fastify' {
  interface FastifyRequest {
    user: User;
  }
}

function userIdFor(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

export function resolveIdentity(
  req: FastifyRequest,
  auth: AppConfig['auth'],
): { email: string; name: string } | null {
  if (auth.mode === 'proxy') {
    const email = req.headers[auth.proxyEmailHeader];
    if (typeof email !== 'string' || !email) return null;
    const name = req.headers[auth.proxyNameHeader];
    return { email, name: typeof name === 'string' && name ? name : email.split('@')[0]! };
  }
  const email = req.headers['x-dev-email'];
  const name = req.headers['x-dev-name'];
  return {
    email: typeof email === 'string' && email ? email : auth.devEmail,
    name: typeof name === 'string' && name ? name : auth.devName,
  };
}

export function registerAuth(app: FastifyInstance, db: Db, auth: AppConfig['auth']): void {
  const upsert = db.prepare(
    `INSERT INTO users (id, email, name) VALUES (?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET name = excluded.name`,
  );
  const get = db.prepare('SELECT id, email, name, avatar_url, role FROM users WHERE email = ?');

  app.addHook('onRequest', async (req, reply) => {
    // Only API routes need a user identity; static assets and /healthz are
    // open, and webhooks authenticate with an HMAC signature instead.
    if (!req.url.startsWith('/api/') || req.url.startsWith('/api/webhooks/')) return;

    const identity = resolveIdentity(req, auth);
    if (!identity) {
      reply.code(401).send({ error: 'unauthenticated', message: 'missing identity headers from auth proxy' });
      return reply;
    }
    upsert.run(userIdFor(identity.email), identity.email, identity.name);
    const row = get.get(identity.email) as
      | { id: string; email: string; name: string; avatar_url: string | null; role: string }
      | undefined;
    req.user = {
      id: row!.id,
      email: row!.email,
      name: row!.name,
      avatarUrl: row!.avatar_url,
      role: row!.role,
    };
  });
}
