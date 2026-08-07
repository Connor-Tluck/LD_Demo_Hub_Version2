import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { CatalogDemo } from '../catalog/schema.js';

// Turns an approved submission into a pull request against the gallery repo:
// branch → add catalog/demos/<slug>.json (+ optional demo files) → open PR.

export interface RepoFile {
  path: string;
  content: Buffer;
}

export interface OpenedPr {
  prNumber: number;
  prUrl: string;
  branch: string;
  mode: 'live' | 'demo';
}

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class GitHubService {
  constructor(
    private config: AppConfig['github'],
    private repoRoot: string,
  ) {}

  get liveMode(): boolean {
    return this.config.token !== null;
  }

  private async gh(method: string, pathname: string, body?: unknown): Promise<Response> {
    return fetch(`https://api.github.com${pathname}`, {
      method,
      headers: {
        authorization: `Bearer ${this.config.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private async putFileOnBranch(
    repo: string,
    branch: string,
    filePath: string,
    content: Buffer,
    message: string,
  ): Promise<void> {
    const existing = await this.gh('GET', `/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`);
    const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;
    const putRes = await this.gh('PUT', `/repos/${repo}/contents/${filePath}`, {
      message,
      content: content.toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    });
    if (!putRes.ok) throw new GitHubError(putRes.status, `failed to write ${filePath}`);
  }

  private writeLocalFiles(files: RepoFile[]): void {
    for (const file of files) {
      const dest = path.join(this.repoRoot, file.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, file.content);
    }
  }

  async openDemoPr(
    demo: CatalogDemo,
    submittedBy: { name: string; email: string },
    extraFiles: RepoFile[] = [],
  ): Promise<OpenedPr> {
    const branch = `demo/${demo.id}`;
    const catalogPath = `catalog/demos/${demo.id}.json`;
    const files: RepoFile[] = [
      { path: catalogPath, content: Buffer.from(JSON.stringify(demo, null, 2) + '\n') },
      ...extraFiles,
    ];

    if (!this.liveMode) {
      this.writeLocalFiles(files);
      const prNumber = 100 + (crypto.randomBytes(2).readUInt16BE(0) % 900);
      return {
        prNumber,
        prUrl: `https://github.com/${this.config.galleryRepo}/pull/${prNumber}`,
        branch,
        mode: 'demo',
      };
    }

    const repo = this.config.galleryRepo;
    const base = this.config.baseBranch;

    const refRes = await this.gh('GET', `/repos/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    if (!refRes.ok) throw new GitHubError(refRes.status, `cannot read base branch ${base}`);
    const baseSha = ((await refRes.json()) as { object: { sha: string } }).object.sha;

    const createRef = await this.gh('POST', `/repos/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
    if (!createRef.ok && createRef.status !== 422) {
      throw new GitHubError(createRef.status, `failed to create branch ${branch}`);
    }

    for (const file of files) {
      await this.putFileOnBranch(repo, branch, file.path, file.content, `Add demo: ${demo.title}`);
    }

    const prBody = [
      `## New demo submission: ${demo.title}`,
      '',
      `**Submitted by:** ${submittedBy.name} (${submittedBy.email})`,
      `**Category:** ${demo.category}`,
      demo.customer ? `**Customer:** ${demo.customer}` : '**Customer:** (none — internal/generic demo)',
      `**Demo repo:** ${demo.repo.owner}/${demo.repo.name}${demo.repo.path ? `/${demo.repo.path}` : ''} @ ${demo.repo.branch}`,
      extraFiles.length > 0 ? `**Uploaded files:** ${extraFiles.length} file(s) in \`demos/${demo.id}/\`` : '',
      demo.launchDarkly
        ? `**LaunchDarkly:** \`${demo.launchDarkly.projectKey}\` / \`${demo.launchDarkly.environmentKey}\` · ${demo.launchDarkly.flags.length} flag(s)`
        : '**LaunchDarkly:** none',
      '',
      demo.description,
      '',
      '_Opened by the SE Demo Hub submission agent. Merging publishes the demo._',
    ]
      .filter(Boolean)
      .join('\n');

    const prRes = await this.gh('POST', `/repos/${repo}/pulls`, {
      title: `Add demo: ${demo.title}`,
      head: branch,
      base,
      body: prBody,
    });
    if (!prRes.ok) {
      const listRes = await this.gh('GET', `/repos/${repo}/pulls?head=${repo.split('/')[0]}:${branch}&state=open`);
      if (listRes.ok) {
        const open = (await listRes.json()) as Array<{ number: number; html_url: string }>;
        if (open[0]) return { prNumber: open[0].number, prUrl: open[0].html_url, branch, mode: 'live' };
      }
      throw new GitHubError(prRes.status, 'failed to open pull request');
    }
    const pr = (await prRes.json()) as { number: number; html_url: string };
    return { prNumber: pr.number, prUrl: pr.html_url, branch, mode: 'live' };
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
    if (!this.config.webhookSecret) return false;
    if (!signatureHeader?.startsWith('sha256=')) return false;
    const expected = crypto.createHmac('sha256', this.config.webhookSecret).update(rawBody).digest('hex');
    const provided = signatureHeader.slice('sha256='.length);
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  }
}
