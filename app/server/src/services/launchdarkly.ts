import type { Db } from '../db/index.js';
import type { AppConfig } from '../config.js';
import type { CatalogDemo } from '../catalog/schema.js';
import type { Flag } from '../types.js';

// Server-side proxy for the LaunchDarkly REST API — no LD tokens ever reach
// the browser. Two modes:
//
//   live (LD_API_TOKEN set)   → reads real flag state, writes via semantic
//                               patches, can provision missing flags and
//                               reset an environment to catalog defaults.
//   demo (no token)           → flag state lives in the flag_overrides table
//                               so the split view is fully interactive with
//                               zero credentials. Flags report source:'local'.
//
// Value semantics: "the value served to everyone in the demo environment".
// Reads resolve off-variation when targeting is off, otherwise the
// fallthrough variation. Writes keep targeting ON and point the fallthrough
// at the variation matching the requested value — one consistent, reversible
// mechanism for both boolean and multivariate flags.

interface LdVariation {
  _id: string;
  value: unknown;
  name?: string;
}

interface LdFlagResponse {
  key: string;
  name: string;
  description?: string;
  kind: string;
  variations: LdVariation[];
  environments: Record<
    string,
    { on: boolean; offVariation?: number; fallthrough?: { variation?: number; rollout?: unknown } }
  >;
}

export class LdApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class LaunchDarklyService {
  constructor(
    private config: AppConfig['launchDarkly'],
    private db: Db,
  ) {}

  get liveMode(): boolean {
    return this.config.apiToken !== null;
  }

  flagUrl(projectKey: string, envKey: string, flagKey: string): string {
    return `${this.config.baseUrl}/projects/${projectKey}/flags/${flagKey}/targeting?env=${envKey}&selected-env=${envKey}`;
  }

  private async request(method: string, pathname: string, body?: unknown, semanticPatch = false): Promise<Response> {
    const res = await fetch(`${this.config.baseUrl}/api/v2${pathname}`, {
      method,
      headers: {
        authorization: this.config.apiToken!,
        'content-type': semanticPatch
          ? 'application/json; domain-model=launchdarkly.semanticpatch'
          : 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res;
  }

  // ── Reads ────────────────────────────────────────────────────────────

  async getFlags(demo: CatalogDemo): Promise<Flag[]> {
    const ld = demo.launchDarkly;
    if (!ld) return [];
    if (!this.liveMode) return this.getFlagsLocal(demo);

    const local = this.getFlagsLocal(demo);
    return Promise.all(
      ld.flags.map(async (cf) => {
        const res = await this.request(
          'GET',
          `/flags/${ld.projectKey}/${cf.key}?env=${encodeURIComponent(ld.environmentKey)}`,
        );
        if (res.status === 404) {
          // Flag not created in LD yet (e.g. the demo's own setup script
          // hasn't run) — fall back to catalog defaults so the panel renders.
          return local.find((f) => f.key === cf.key)!;
        }
        if (!res.ok) {
          throw new LdApiError(res.status, `LaunchDarkly: failed to read flag ${cf.key} (${res.status})`);
        }
        const flag = (await res.json()) as LdFlagResponse;
        const envCfg = flag.environments[ld.environmentKey];
        let currentValue: unknown = cf.defaultValue;
        if (envCfg) {
          const idx = envCfg.on ? envCfg.fallthrough?.variation : envCfg.offVariation;
          if (idx !== undefined && flag.variations[idx]) currentValue = flag.variations[idx].value;
        }
        return {
          key: cf.key,
          name: cf.name,
          description: cf.description,
          kind: cf.kind,
          defaultValue: cf.defaultValue,
          variations: cf.variations,
          currentValue,
          launchDarklyUrl: this.flagUrl(ld.projectKey, ld.environmentKey, cf.key),
          source: 'launchdarkly' as const,
        };
      }),
    );
  }

  private getFlagsLocal(demo: CatalogDemo): Flag[] {
    const ld = demo.launchDarkly!;
    const stmt = this.db.prepare('SELECT value_json FROM flag_overrides WHERE demo_id = ? AND flag_key = ?');
    return ld.flags.map((cf) => {
      const row = stmt.get(demo.id, cf.key) as { value_json: string } | undefined;
      return {
        key: cf.key,
        name: cf.name,
        description: cf.description,
        kind: cf.kind,
        defaultValue: cf.defaultValue,
        variations: cf.variations,
        currentValue: row ? JSON.parse(row.value_json) : cf.defaultValue,
        launchDarklyUrl: this.flagUrl(ld.projectKey, ld.environmentKey, cf.key),
        source: 'local' as const,
      };
    });
  }

  // ── Writes ───────────────────────────────────────────────────────────

  async setFlagValue(demo: CatalogDemo, flagKey: string, value: unknown): Promise<Flag> {
    const ld = demo.launchDarkly;
    if (!ld) throw new LdApiError(400, 'demo has no LaunchDarkly configuration');
    const catalogFlag = ld.flags.find((f) => f.key === flagKey);
    if (!catalogFlag) throw new LdApiError(404, `flag ${flagKey} is not connected to this demo`);
    if (!catalogFlag.variations.some((v) => sameValue(v.value, value))) {
      throw new LdApiError(400, `value does not match any variation of ${flagKey}`);
    }

    if (!this.liveMode) {
      this.db
        .prepare(
          `INSERT INTO flag_overrides (demo_id, flag_key, value_json, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(demo_id, flag_key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`,
        )
        .run(demo.id, flagKey, JSON.stringify(value));
      const flags = this.getFlagsLocal(demo);
      return flags.find((f) => f.key === flagKey)!;
    }

    // Live: look up the variation id, then semantic-patch the environment.
    const flagRes = await this.request('GET', `/flags/${ld.projectKey}/${flagKey}`);
    if (!flagRes.ok) throw new LdApiError(flagRes.status, `LaunchDarkly: flag ${flagKey} not found`);
    const flag = (await flagRes.json()) as LdFlagResponse;
    const variation = flag.variations.find((v) => sameValue(v.value, value));
    if (!variation) throw new LdApiError(400, `no LD variation matches the requested value for ${flagKey}`);

    const patchRes = await this.request(
      'PATCH',
      `/flags/${ld.projectKey}/${flagKey}`,
      {
        environmentKey: ld.environmentKey,
        instructions: [
          { kind: 'turnFlagOn' },
          { kind: 'updateFallthroughVariationOrRollout', variationId: variation._id },
        ],
        comment: `Demo Gallery: set ${flagKey} for demo ${demo.id}`,
      },
      true,
    );
    if (!patchRes.ok) {
      const text = await patchRes.text();
      throw new LdApiError(patchRes.status, `LaunchDarkly: failed to update ${flagKey}: ${text.slice(0, 300)}`);
    }
    const flags = await this.getFlags(demo);
    return flags.find((f) => f.key === flagKey)!;
  }

  // ── Environment lifecycle (SEs "rebuilding env") ─────────────────────

  /** Create any flags from the catalog that don't exist in LD yet. */
  async provisionEnvironment(demo: CatalogDemo): Promise<{ created: string[]; existing: string[] }> {
    const ld = demo.launchDarkly;
    if (!ld) throw new LdApiError(400, 'demo has no LaunchDarkly configuration');
    if (!this.liveMode) {
      // Demo mode: nothing to create; overrides table is the environment.
      return { created: [], existing: ld.flags.map((f) => f.key) };
    }
    const created: string[] = [];
    const existing: string[] = [];
    for (const cf of ld.flags) {
      const check = await this.request('GET', `/flags/${ld.projectKey}/${cf.key}`);
      if (check.ok) {
        existing.push(cf.key);
        continue;
      }
      const res = await this.request('POST', `/flags/${ld.projectKey}`, {
        key: cf.key,
        name: cf.name,
        description: cf.description,
        variations: cf.variations.map((v) => ({ value: v.value, name: v.name })),
        temporary: false,
        tags: ['demo-gallery', demo.id],
      });
      if (!res.ok) {
        const text = await res.text();
        throw new LdApiError(res.status, `LaunchDarkly: failed to create ${cf.key}: ${text.slice(0, 300)}`);
      }
      created.push(cf.key);
    }
    return { created, existing };
  }

  /**
   * Reset every connected flag back to the defaults defined in the catalog.
   * This is the "rebuild my environment" button after a customer call has
   * left flags in a messy state.
   */
  async resetEnvironment(demo: CatalogDemo): Promise<Flag[]> {
    const ld = demo.launchDarkly;
    if (!ld) throw new LdApiError(400, 'demo has no LaunchDarkly configuration');
    if (!this.liveMode) {
      this.db.prepare('DELETE FROM flag_overrides WHERE demo_id = ?').run(demo.id);
      return this.getFlagsLocal(demo);
    }
    for (const cf of ld.flags) {
      await this.setFlagValue(demo, cf.key, cf.defaultValue);
    }
    return this.getFlags(demo);
  }
}
