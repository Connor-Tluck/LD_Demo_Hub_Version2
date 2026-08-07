import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { InternalTool } from '../types.js';
import { catalogDemoSchema, internalToolSchema, toolsFileSchema, type CatalogDemo } from './schema.js';

// The catalog is git-backed: every published demo is a JSON file under
// catalog/demos/, and the internal-tools directory is one JSON file per tool
// under catalog/internal-tools/ (legacy catalog/tools.json still read as a
// fallback). catalog/ai-workflows/ and catalog/integrations/ exist in the hub
// repo for intake, but the app doesn't render them yet.
//
// Two sources implement the same interface:
//   local  — reads the directory this server was deployed with. New demos
//            appear on the next deploy (or via POST /api/catalog/refresh
//            if the deploy pulls the repo in place).
//   github — reads the same files through the GitHub contents API with a
//            short cache, so merged PRs appear without a redeploy.

export interface CatalogSnapshot {
  demos: CatalogDemo[];
  tools: InternalTool[];
  loadedAt: string;
  errors: Array<{ file: string; message: string }>;
}

export interface CatalogSource {
  load(): Promise<CatalogSnapshot>;
}

function parseSnapshot(
  files: Array<{ name: string; content: string }>,
  toolFiles: Array<{ name: string; content: string }>,
  toolsJson: string | null,
): Omit<CatalogSnapshot, 'loadedAt'> {
  const demos: CatalogDemo[] = [];
  const errors: CatalogSnapshot['errors'] = [];
  for (const f of files) {
    try {
      const parsed = catalogDemoSchema.parse(JSON.parse(f.content));
      demos.push(parsed);
    } catch (err) {
      errors.push({ file: f.name, message: err instanceof Error ? err.message : String(err) });
    }
  }
  const tools: InternalTool[] = [];
  for (const f of toolFiles) {
    try {
      tools.push(internalToolSchema.parse(JSON.parse(f.content)));
    } catch (err) {
      errors.push({ file: f.name, message: err instanceof Error ? err.message : String(err) });
    }
  }
  // Legacy fallback: a single tools.json (ignored once per-file entries exist).
  if (tools.length === 0 && toolsJson) {
    try {
      tools.push(...toolsFileSchema.parse(JSON.parse(toolsJson)).tools);
    } catch (err) {
      errors.push({ file: 'tools.json', message: err instanceof Error ? err.message : String(err) });
    }
  }
  tools.sort((a, b) => a.name.localeCompare(b.name));
  return { demos, tools, errors };
}

export class LocalCatalogSource implements CatalogSource {
  constructor(private dir: string) {}

  private async readJsonDir(dir: string): Promise<Array<{ name: string; content: string }>> {
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
    return Promise.all(
      entries.map(async (name) => ({
        name,
        content: await fs.readFile(path.join(dir, name), 'utf8'),
      })),
    );
  }

  async load(): Promise<CatalogSnapshot> {
    const demosDir = path.join(this.dir, 'demos');
    try {
      await fs.readdir(demosDir);
    } catch {
      // Missing directory → empty catalog, surfaced as an error entry.
      return {
        demos: [],
        tools: [],
        loadedAt: new Date().toISOString(),
        errors: [{ file: demosDir, message: 'catalog demos directory not found' }],
      };
    }
    const files = await this.readJsonDir(demosDir);
    const toolFiles = await this.readJsonDir(path.join(this.dir, 'internal-tools'));
    let toolsJson: string | null = null;
    try {
      toolsJson = await fs.readFile(path.join(this.dir, 'tools.json'), 'utf8');
    } catch {
      toolsJson = null;
    }
    return { ...parseSnapshot(files, toolFiles, toolsJson), loadedAt: new Date().toISOString() };
  }
}

export class GitHubCatalogSource implements CatalogSource {
  constructor(
    private repo: string, // owner/name
    private ref: string,
    private token: string | null, // optional: public repos read fine without one, just rate-limited harder
  ) {}

  private async gh(pathname: string): Promise<Response> {
    return fetch(`https://api.github.com${pathname}`, {
      headers: {
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
    });
  }

  private async fileContent(repoPath: string): Promise<string | null> {
    const res = await this.gh(`/repos/${this.repo}/contents/${repoPath}?ref=${encodeURIComponent(this.ref)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { content?: string; encoding?: string };
    if (!body.content) return null;
    return Buffer.from(body.content, 'base64').toString('utf8');
  }

  private async dirJsonFiles(repoPath: string): Promise<Array<{ name: string; content: string }> | null> {
    const listRes = await this.gh(
      `/repos/${this.repo}/contents/${repoPath}?ref=${encodeURIComponent(this.ref)}`,
    );
    if (!listRes.ok) return null;
    const listing = (await listRes.json()) as Array<{ name: string; path: string; type: string }>;
    const files: Array<{ name: string; content: string }> = [];
    for (const item of listing) {
      if (item.type !== 'file' || !item.name.endsWith('.json')) continue;
      const content = await this.fileContent(item.path);
      if (content !== null) files.push({ name: item.name, content });
    }
    return files;
  }

  async load(): Promise<CatalogSnapshot> {
    const files = await this.dirJsonFiles('catalog/demos');
    if (files === null) {
      return {
        demos: [],
        tools: [],
        loadedAt: new Date().toISOString(),
        errors: [{ file: 'catalog/demos', message: 'GitHub API error listing catalog/demos' }],
      };
    }
    const toolFiles = (await this.dirJsonFiles('catalog/internal-tools')) ?? [];
    const toolsJson = toolFiles.length === 0 ? await this.fileContent('catalog/tools.json') : null;
    return { ...parseSnapshot(files, toolFiles, toolsJson), loadedAt: new Date().toISOString() };
  }
}

/** Caching wrapper so hot paths never wait on disk/network. */
export class CatalogService {
  private snapshot: CatalogSnapshot | null = null;
  private loadedAtMs = 0;
  private inflight: Promise<CatalogSnapshot> | null = null;

  constructor(
    private source: CatalogSource,
    private ttlMs: number,
  ) {}

  async get(): Promise<CatalogSnapshot> {
    const fresh = this.snapshot && Date.now() - this.loadedAtMs < this.ttlMs;
    if (this.snapshot && fresh) return this.snapshot;
    if (!this.inflight) {
      this.inflight = this.source
        .load()
        .then((snap) => {
          this.snapshot = snap;
          this.loadedAtMs = Date.now();
          return snap;
        })
        .finally(() => {
          this.inflight = null;
        });
    }
    // Serve stale while revalidating if we have anything at all.
    return this.snapshot ?? this.inflight;
  }

  /** Force a reload (webhook on PR merge, manual refresh endpoint). */
  async refresh(): Promise<CatalogSnapshot> {
    this.snapshot = null;
    this.loadedAtMs = 0;
    return this.get();
  }
}

export function buildCatalogService(config: AppConfig): CatalogService {
  const source: CatalogSource =
    config.catalog.source === 'github'
      ? new GitHubCatalogSource(config.github.galleryRepo, config.github.baseBranch, config.github.token)
      : new LocalCatalogSource(config.catalog.dir);
  return new CatalogService(source, config.catalog.ttlSeconds * 1000);
}
