import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env if present (Node 21+ built-in; no dotenv dependency).
try {
  process.loadEnvFile(path.resolve(here, '../.env'));
} catch {
  /* no .env file — real env vars only */
}

function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

export interface AppConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  databasePath: string;
  auth: {
    mode: 'dev' | 'proxy';
    devEmail: string;
    devName: string;
    proxyEmailHeader: string;
    proxyNameHeader: string;
  };
  launchDarkly: {
    apiToken: string | null;
    baseUrl: string;
    /** Default project/env for new submissions (existing demos carry their own in the catalog). */
    projectKey: string;
    environmentKey: string;
  };
  github: {
    token: string | null;
    galleryRepo: string; // owner/name
    baseBranch: string;
    webhookSecret: string | null;
  };
  catalog: {
    source: 'local' | 'github';
    dir: string;
    ttlSeconds: number;
  };
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const base: AppConfig = {
    port: Number(env('PORT', '8787')),
    host: env('HOST', '0.0.0.0'),
    corsOrigins: env('CORS_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    databasePath: env('DATABASE_PATH', path.resolve(here, '../data/gallery.db')),
    auth: {
      mode: env('AUTH_MODE', 'dev') === 'proxy' ? 'proxy' : 'dev',
      devEmail: env('DEV_USER_EMAIL', 'dev@example.com'),
      devName: env('DEV_USER_NAME', 'Dev User'),
      proxyEmailHeader: env('AUTH_PROXY_EMAIL_HEADER', 'x-forwarded-email').toLowerCase(),
      proxyNameHeader: env('AUTH_PROXY_NAME_HEADER', 'x-forwarded-user').toLowerCase(),
    },
    launchDarkly: {
      apiToken: env('LD_API_TOKEN', '') || null,
      baseUrl: env('LD_BASE_URL', 'https://app.launchdarkly.com'),
      projectKey: env('LD_PROJECT_KEY', 'CT-Demo_Hub'),
      environmentKey: env('LD_ENVIRONMENT_KEY', 'production'),
    },
    github: {
      token: env('GITHUB_TOKEN', '') || null,
      galleryRepo: env('GALLERY_REPO', 'Connor-Tluck/LD_Demo_Hub_Version2'),
      baseBranch: env('GALLERY_BASE_BRANCH', 'main'),
      webhookSecret: env('GITHUB_WEBHOOK_SECRET', '') || null,
    },
    catalog: {
      source: env('CATALOG_SOURCE', 'local') === 'github' ? 'github' : 'local',
      dir: path.resolve(here, '..', env('CATALOG_DIR', '../../catalog')),
      ttlSeconds: Number(env('CATALOG_TTL_SECONDS', '60')),
    },
  };
  return { ...base, ...overrides };
}
