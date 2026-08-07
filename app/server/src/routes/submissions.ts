import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../app.js';
import { catalogDemoSchema, type CatalogDemo } from '../catalog/schema.js';
import { GitHubError, type RepoFile } from '../services/github.js';

const submissionSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  longDescription: z.array(z.string()).optional(),
  category: z.string().min(1),
  customer: z.string().optional(),
  tags: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  sourceType: z.enum(['github', 'upload']).default('github'),
  repo: z
    .object({
      url: z.string().optional(),
      owner: z.string().optional(),
      name: z.string().optional(),
      path: z.string().optional(),
      branch: z.string().default('main'),
    })
    .optional(),
  liveDemoUrl: z.string().url().nullable().optional(),
  launchDarkly: z
    .object({
      projectKey: z.string().min(1),
      environmentKey: z.string().min(1),
      flagKeys: z.array(z.string()).default([]),
    })
    .nullable()
    .optional(),
});

const GRADIENTS = [
  'linear-gradient(135deg,#3355FF,#7B5CFF)',
  'linear-gradient(135deg,#0EA5A5,#10B981)',
  'linear-gradient(135deg,#7C3AED,#DB2777)',
  'linear-gradient(135deg,#F97316,#EF4444)',
  'linear-gradient(135deg,#2563EB,#06B6D4)',
  'linear-gradient(135deg,#16A34A,#65A30D)',
  'linear-gradient(135deg,#475569,#0F172A)',
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function pick<T>(arr: T[], seed: string): T {
  const n = crypto.createHash('sha1').update(seed).digest().readUInt32BE(0);
  return arr[n % arr.length]!;
}

function parseRepo(input: { url?: string; owner?: string; name?: string; branch?: string }): { owner: string; name: string } | null {
  if (input.owner && input.name) return { owner: input.owner, name: input.name };
  const raw = input.url ?? '';
  const m =
    raw.match(/github\.com[/:]([^/]+)\/([^/#?]+)/) ??
    raw.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!m) return null;
  return { owner: m[1]!, name: m[2]!.replace(/\.git$/, '') };
}

function titleCase(key: string): string {
  return key
    .split(/[-_.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function hubRepoParts(galleryRepo: string): { owner: string; name: string } {
  const [owner, name] = galleryRepo.split('/');
  return { owner: owner!, name: name! };
}

async function buildCatalogDoc(
  input: z.infer<typeof submissionSchema>,
  id: string,
  user: { name: string; email: string },
  galleryRepo: string,
): Promise<CatalogDemo> {
  const today = new Date().toISOString().slice(0, 10);
  const hub = hubRepoParts(galleryRepo);
  const repo =
    input.sourceType === 'upload'
      ? { owner: hub.owner, name: hub.name, path: `demos/${id}`, branch: 'main' }
      : (() => {
      const parsed = parseRepo(input.repo ?? { branch: 'main' });
          if (!parsed) throw new Error('repo must be a GitHub URL, "owner/name", or explicit owner+name');
          return {
            owner: parsed.owner,
            name: parsed.name,
            path: input.repo?.path || undefined,
            branch: input.repo?.branch ?? 'main',
          };
        })();

  return catalogDemoSchema.parse({
    id,
    title: input.title,
    mono: input.title
      .split(/\s+/)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2),
    gradient: pick(GRADIENTS, id),
    description: input.description,
    longDescription: input.longDescription ?? [input.description],
    tags: input.tags,
    customer: input.customer?.trim() || undefined,
    category: input.category,
    techStack: input.techStack,
    author: {
      name: user.name,
      email: user.email,
      avatarColor: pick(GRADIENTS, user.email),
    },
    createdAt: today,
    updatedAt: today,
    status: 'published',
    repo,
    liveDemoUrl: input.liveDemoUrl ?? null,
    launchDarkly: input.launchDarkly
      ? {
          projectKey: input.launchDarkly.projectKey,
          environmentKey: input.launchDarkly.environmentKey,
          flags: input.launchDarkly.flagKeys.map((key) => ({
            key,
            name: titleCase(key),
            description: '',
            kind: 'boolean' as const,
            defaultValue: false,
            variations: [],
          })),
        }
      : null,
  });
}

export function submissionRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post('/api/demos', async (req, reply) => {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', issues: parsed.error.issues });
    const input = parsed.data;

    if (input.sourceType === 'github') {
      const repo = parseRepo(input.repo ?? { branch: 'main' });
      if (!repo) {
        return reply
          .code(400)
          .send({ error: 'bad_request', message: 'repo must be a GitHub URL, "owner/name", or explicit owner+name' });
      }
    }

    const id = slugify(input.title);
    if (!id) return reply.code(400).send({ error: 'bad_request', message: 'title does not produce a valid slug' });
    if (await ctx.demos.catalogDoc(id)) {
      return reply.code(409).send({ error: 'duplicate', message: `a demo with slug "${id}" already exists` });
    }

    let doc: CatalogDemo;
    try {
      doc = await buildCatalogDoc(input, id, req.user, ctx.config.github.galleryRepo);
    } catch (err) {
      return reply.code(400).send({ error: 'bad_request', message: err instanceof Error ? err.message : 'invalid submission' });
    }

    try {
      const pr = await ctx.github.openDemoPr(doc, { name: req.user.name, email: req.user.email });
      ctx.db
        .prepare(
          `INSERT INTO submissions (id, demo_id, payload_json, pr_number, pr_url, status, submitted_by)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .run(crypto.randomUUID(), id, JSON.stringify(doc), pr.prNumber, pr.prUrl, req.user.id);
      ctx.demos.recordEvent(id, req.user.id, 'submit');
      return reply.code(201).send({ prUrl: pr.prUrl, prNumber: pr.prNumber, status: 'pr_opened', demoId: id });
    } catch (err) {
      if (err instanceof GitHubError)
        return reply.code(502).send({ error: 'github_error', message: err.message, status: err.status });
      throw err;
    }
  });

  app.post('/api/demos/upload', async (req, reply) => {
    const parts = req.parts();
    const fields: Record<string, string> = {};
    const uploads: Array<{ filename: string; buffer: Buffer }> = [];

    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (buffer.length > 0) uploads.push({ filename: part.filename, buffer });
      } else {
        fields[part.fieldname] = String(part.value);
      }
    }

    let payload: z.infer<typeof submissionSchema>;
    try {
      payload = submissionSchema.parse({
        ...JSON.parse(fields.payload ?? '{}'),
        sourceType: 'upload',
      });
    } catch (err) {
      if (err instanceof z.ZodError) return reply.code(400).send({ error: 'bad_request', issues: err.issues });
      return reply.code(400).send({ error: 'bad_request', message: 'invalid payload JSON' });
    }

    if (uploads.length === 0) {
      return reply.code(400).send({ error: 'bad_request', message: 'at least one project file is required for upload submissions' });
    }

    const id = slugify(payload.title);
    if (!id) return reply.code(400).send({ error: 'bad_request', message: 'title does not produce a valid slug' });
    if (await ctx.demos.catalogDoc(id)) {
      return reply.code(409).send({ error: 'duplicate', message: `a demo with slug "${id}" already exists` });
    }

    let doc: CatalogDemo;
    try {
      doc = await buildCatalogDoc(payload, id, req.user, ctx.config.github.galleryRepo);
    } catch (err) {
      return reply.code(400).send({ error: 'bad_request', message: err instanceof Error ? err.message : 'invalid submission' });
    }

    const extraFiles: RepoFile[] = uploads.map((file) => ({
      path: `demos/${id}/${file.filename.replace(/^[/\\]+/, '')}`,
      content: file.buffer,
    }));

    try {
      const pr = await ctx.github.openDemoPr(doc, { name: req.user.name, email: req.user.email }, extraFiles);
      ctx.db
        .prepare(
          `INSERT INTO submissions (id, demo_id, payload_json, pr_number, pr_url, status, submitted_by)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        )
        .run(crypto.randomUUID(), id, JSON.stringify(doc), pr.prNumber, pr.prUrl, req.user.id);
      ctx.demos.recordEvent(id, req.user.id, 'submit');
      return reply.code(201).send({ prUrl: pr.prUrl, prNumber: pr.prNumber, status: 'pr_opened', demoId: id });
    } catch (err) {
      if (err instanceof GitHubError)
        return reply.code(502).send({ error: 'github_error', message: err.message, status: err.status });
      throw err;
    }
  });
}
