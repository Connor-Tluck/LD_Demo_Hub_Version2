import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import type { CatalogDemo } from '../catalog/schema.js';
import type { AppConfig } from '../config.js';

export interface DemoReadmeResult {
  html: string;
  source: 'github' | 'local';
  url: string;
}

const cache = new Map<string, { at: number; value: DemoReadmeResult | null }>();
const TTL_MS = 5 * 60 * 1000;

const README_NAMES = ['README.md', 'readme.md', 'Readme.md'];

export class ReadmeService {
  constructor(
    private github: AppConfig['github'],
    private repoRoot: string,
  ) {}

  private headers(accept: string): Record<string, string> {
    const h: Record<string, string> = {
      accept,
      'x-github-api-version': '2022-11-28',
    };
    if (this.github.token) h.authorization = `Bearer ${this.github.token}`;
    return h;
  }

  private cacheKey(demo: CatalogDemo): string {
    return `${demo.repo.owner}/${demo.repo.name}@${demo.repo.branch}:${demo.repo.path ?? ''}`;
  }

  private readLocalReadme(relativePath: string): string | null {
    for (const name of README_NAMES) {
      const file = path.join(this.repoRoot, relativePath, name);
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    }
    return null;
  }

  private toHtml(markdown: string): string {
    return marked.parse(markdown, { gfm: true, breaks: true }) as string;
  }

  private async fetchGithubRaw(owner: string, name: string, branch: string, filePath: string): Promise<string | null> {
    const ref = encodeURIComponent(branch);
    const url =
      filePath === 'README.md'
        ? `https://api.github.com/repos/${owner}/${name}/readme?ref=${ref}`
        : `https://api.github.com/repos/${owner}/${name}/contents/${filePath}?ref=${ref}`;
    const res = await fetch(url, { headers: this.headers('application/vnd.github.raw') });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.text();
  }

  async forDemo(demo: CatalogDemo): Promise<DemoReadmeResult | null> {
    const key = this.cacheKey(demo);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const { owner, name, branch, path: repoPath } = demo.repo;
    const htmlUrl = repoPath
      ? `https://github.com/${owner}/${name}/tree/${branch}/${repoPath}`
      : `https://github.com/${owner}/${name}#readme`;

    // Local demo code in this monorepo (uploads under demos/<slug>/).
    if (repoPath) {
      const local = this.readLocalReadme(repoPath);
      if (local) {
        const value = { html: this.toHtml(local), source: 'local' as const, url: htmlUrl };
        cache.set(key, { at: Date.now(), value });
        return value;
      }
    }

    const candidates = repoPath
      ? README_NAMES.map((n) => `${repoPath}/${n}`)
      : ['README.md'];

    for (const filePath of candidates) {
      const raw = await this.fetchGithubRaw(owner, name, branch, filePath);
      if (raw) {
        const value = { html: this.toHtml(raw), source: 'github' as const, url: htmlUrl };
        cache.set(key, { at: Date.now(), value });
        return value;
      }
    }

    cache.set(key, { at: Date.now(), value: null });
    return null;
  }
}
