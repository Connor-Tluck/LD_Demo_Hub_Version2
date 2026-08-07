import { z } from 'zod';

// Validation for catalog documents (catalog/demos/*.json). These files are
// the source of truth for the gallery; submissions must pass this schema
// before the agent opens a PR, and invalid files are skipped (and logged)
// at load time so one bad merge can't take the gallery down.

export const flagVariationSchema = z.object({
  value: z.unknown(),
  name: z.string().min(1),
});

export const catalogFlagSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9][a-z0-9._-]*$/i, 'flag key must be a valid LD flag key'),
    name: z.string().min(1),
    description: z.string().default(''),
    kind: z.enum(['boolean', 'multivariate']),
    defaultValue: z.unknown(),
    variations: z.array(flagVariationSchema).default([]),
  })
  .transform((f) => ({
    ...f,
    // Boolean flags get canonical variations if the author omitted them.
    variations:
      f.variations.length > 0
        ? f.variations
        : f.kind === 'boolean'
          ? [
              { value: true, name: 'On' },
              { value: false, name: 'Off' },
            ]
          : f.variations,
  }));

export const catalogDemoSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be a url-safe slug'),
  title: z.string().min(1),
  mono: z.string().min(1).max(3),
  gradient: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  /** Customer account name when this is a customer-specific demo; omit for internal/generic demos. */
  customer: z.string().optional(),
  category: z.string().min(1),
  techStack: z.array(z.string()).default([]),
  author: z.object({
    name: z.string().min(1),
    // Blank = unknown. Intake-form submissions don't collect an email, and we
    // don't fabricate one; the wizard path fills it from the signed-in user.
    email: z.string().email().or(z.literal('')).default(''),
    avatarColor: z.string().default('linear-gradient(135deg,#3355FF,#7B5CFF)'),
  }),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  status: z.enum(['published', 'draft']).default('published'),
  repo: z.object({
    owner: z.string().min(1),
    name: z.string().min(1),
    path: z.string().optional(),
    branch: z.string().default('main'),
  }),
  liveDemoUrl: z.string().url().nullable().default(null),
  launchDarkly: z
    .object({
      projectKey: z.string().min(1),
      environmentKey: z.string().min(1),
      flags: z.array(catalogFlagSchema).default([]),
    })
    .nullable()
    .default(null),
});

export type CatalogDemo = z.infer<typeof catalogDemoSchema>;

export const internalToolSchema = z.object({
  id: z.string().min(1),
  mono: z.string().min(1).max(3),
  name: z.string().min(1),
  description: z.string().min(1),
  bg: z.string().min(1),
  url: z.string().min(1),
});

// Legacy shape: the whole directory in one catalog/tools.json. Still accepted
// as a fallback; the current layout is one file per tool under
// catalog/internal-tools/ (hub intake writes entries there).
export const toolsFileSchema = z.object({ tools: z.array(internalToolSchema) });
