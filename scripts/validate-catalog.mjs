// Validates every catalog entry. Dependency-free mirror of the gallery app's
// zod schema (server/src/catalog/schema.ts in LD_Demo_Hub_App_Code) — the app
// skips invalid files at load time; this catches them at PR time instead.
// Run: node scripts/validate-catalog.mjs   (exits 1 on any invalid entry)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const errors = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isStrArr = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v);
const isSlug = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(v);
const isEmailOrBlank = (v) => v === '' || (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));

function validateDemo(file, d) {
  if (!isSlug(d.id)) err(file, 'id must be a url-safe slug');
  if (d.id !== basename(file, '.json')) err(file, `id "${d.id}" must match the filename`);
  if (!isStr(d.title)) err(file, 'title is required');
  if (!isStr(d.mono) || d.mono.length > 3) err(file, 'mono must be 1-3 chars');
  if (!isStr(d.gradient)) err(file, 'gradient is required');
  if (!isStr(d.description)) err(file, 'description is required');
  if (d.longDescription !== undefined && !isStrArr(d.longDescription)) err(file, 'longDescription must be a string array');
  for (const k of ['tags', 'techStack']) {
    if (d[k] !== undefined && !isStrArr(d[k])) err(file, `${k} must be a string array`);
  }
  if (!isStr(d.category)) err(file, 'category is required');
  if (!d.author || !isStr(d.author.name)) err(file, 'author.name is required');
  if (d.author && !isEmailOrBlank(d.author.email ?? '')) err(file, 'author.email must be an email or ""');
  if (!isDate(d.createdAt)) err(file, 'createdAt must be YYYY-MM-DD');
  if (!isDate(d.updatedAt)) err(file, 'updatedAt must be YYYY-MM-DD');
  if (d.status !== undefined && !['published', 'draft'].includes(d.status)) err(file, 'status must be published|draft');
  if (!d.repo || !isStr(d.repo.owner) || !isStr(d.repo.name)) err(file, 'repo.owner and repo.name are required');
  if (d.liveDemoUrl !== undefined && d.liveDemoUrl !== null && !/^https?:\/\//.test(d.liveDemoUrl)) {
    err(file, 'liveDemoUrl must be null or a URL');
  }
  if (d.launchDarkly !== undefined && d.launchDarkly !== null) {
    const ld = d.launchDarkly;
    if (!isStr(ld.projectKey) || !isStr(ld.environmentKey)) err(file, 'launchDarkly needs projectKey + environmentKey');
    for (const f of ld.flags ?? []) {
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(f.key ?? '')) err(file, `flag key "${f.key}" is not a valid LD flag key`);
      if (!isStr(f.name)) err(file, `flag "${f.key}": name is required`);
      if (!['boolean', 'multivariate'].includes(f.kind)) err(file, `flag "${f.key}": kind must be boolean|multivariate`);
    }
  }
}

// Link entries (internal-tools / ai-workflows / integrations): the shape the
// gallery's internal-tools grid renders, plus optional hub tagging fields.
function validateLink(file, d) {
  if (!isStr(d.id)) err(file, 'id is required');
  if (d.id !== basename(file, '.json')) err(file, `id "${d.id}" must match the filename`);
  if (!isStr(d.mono) || d.mono.length > 3) err(file, 'mono must be 1-3 chars');
  if (!isStr(d.name)) err(file, 'name is required');
  if (!isStr(d.description)) err(file, 'description is required');
  if (!isStr(d.bg)) err(file, 'bg (gradient) is required');
  if (!isStr(d.url)) err(file, 'url is required ("#" is allowed for placeholders)');
  for (const k of ['languages', 'ldFeatures', 'tags']) {
    if (d[k] !== undefined && !isStrArr(d[k])) err(file, `${k} must be a string array`);
  }
}

const CATEGORIES = ['demos', 'internal-tools', 'ai-workflows', 'integrations'];
let count = 0;
for (const slug of CATEGORIES) {
  const dir = join('catalog', slug);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const file = join(dir, f);
    count++;
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      err(file, `invalid JSON: ${e.message}`);
      continue;
    }
    (slug === 'demos' ? validateDemo : validateLink)(file, data);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s) in ${count} entries:\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${count} catalog entries valid.`);
