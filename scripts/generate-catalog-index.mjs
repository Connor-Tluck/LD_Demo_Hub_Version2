// Scans catalog/ for JSON entries and rebuilds the index in README.md
// between the CATALOG:START / CATALOG:END markers.
// Run: node scripts/generate-catalog-index.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const START = '<!-- CATALOG:START -->';
const END = '<!-- CATALOG:END -->';

// Categories map to folder names; order controls display order.
// Adding a category = new folder here + a new option in
// .github/ISSUE_TEMPLATE/submission.yml + a case in intake.yml. Keep in sync.
const CATEGORIES = [
  ['demos', 'Demos'],
  ['internal-tools', 'Internal Tools'],
  ['ai-workflows', 'AI Workflows'],
  ['integrations', 'Integrations'],
];

// The fixed LD feature vocabulary (mirrors the issue form). Demo entries carry
// these as kebab-case tags; link entries carry them verbatim in ldFeatures.
const LD_FEATURES = [
  'Feature Flags',
  'Experimentation',
  'Observability',
  'Code Control',
  'AI Configs',
  'Agent Control',
  'Guardian',
];
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const FEATURE_BY_TAG = new Map(LD_FEATURES.map((f) => [kebab(f), f]));

function readCategory(slug) {
  const dir = join('catalog', slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: join(dir, f), data: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
}

// Normalize both entry shapes (full demo docs vs. link entries) into one
// row shape the index renders from.
function normalize(slug, { data: d }) {
  if (slug === 'demos') {
    const tags = d.tags ?? [];
    return {
      category: slug,
      name: d.title,
      url: `https://github.com/${d.repo.owner}/${d.repo.name}`,
      owner: d.author?.name ?? '',
      customerSpecific: d.customerSpecific ?? tags.includes('customer-specific'),
      languages: d.techStack ?? [],
      ldFeatures: tags.map((t) => FEATURE_BY_TAG.get(t)).filter(Boolean),
      tags: tags.filter((t) => !FEATURE_BY_TAG.has(t) && t !== 'customer-specific'),
      description: d.description ?? '',
    };
  }
  return {
    category: slug,
    name: d.name,
    url: d.repo || d.url,
    owner: d.owner ?? '',
    customerSpecific: d.customerSpecific ?? false,
    languages: d.languages ?? [],
    ldFeatures: d.ldFeatures ?? [],
    tags: d.tags ?? [],
    description: d.description ?? '',
  };
}

const items = CATEGORIES.flatMap(([slug]) => readCategory(slug).map((e) => normalize(slug, e)));

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const list = (a) => (Array.isArray(a) ? a.join(', ') : a || '');
const link = (i) => (i.url && i.url !== '#' ? `[${esc(i.name)}](${i.url})` : esc(i.name));

function categorySection([slug, label]) {
  const rows = items.filter((i) => i.category === slug).sort((a, b) => a.name.localeCompare(b.name));
  const head =
    '| Name | Owner | Customer-specific | Language(s) | LD features | Description |\n' +
    '| --- | --- | --- | --- | --- | --- |';
  const body = rows.length
    ? rows
        .map(
          (i) =>
            `| ${link(i)} | ${esc(i.owner)} | ${i.customerSpecific ? 'Yes' : 'No'} | ${esc(list(i.languages))} | ${esc(list(i.ldFeatures))} | ${esc(i.description)} |`,
        )
        .join('\n')
    : '| _nothing here yet_ |  |  |  |  |  |';
  return `### ${label} (${rows.length})\n\n${head}\n${body}\n`;
}

// "Browse by X" — inverts a multi-value field into value -> item names.
function facet(key) {
  const map = new Map();
  for (const i of items) {
    for (const v of Array.isArray(i[key]) ? i[key] : []) {
      if (!map.has(v)) map.set(v, new Set());
      map.get(v).add(i.name);
    }
  }
  if (!map.size) return '_None tagged yet._';
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([v, names]) => `- **${v}** — ${[...names].sort().join(', ')}`)
    .join('\n');
}

const counts = CATEGORIES.map(
  ([slug, label]) => `${label}: ${items.filter((i) => i.category === slug).length}`,
).join(' · ');

const block = [
  START,
  `_${items.length} item(s). Auto-generated from \`catalog/\` — do not edit by hand._`,
  '',
  `**${counts}**`,
  '',
  ...CATEGORIES.map(categorySection),
  '## Browse by LD feature',
  '',
  facet('ldFeatures'),
  '',
  '## Browse by language',
  '',
  facet('languages'),
  '',
  '## Browse by tag',
  '',
  facet('tags'),
  END,
].join('\n');

const readme = readFileSync('README.md', 'utf8');
if (!readme.includes(START) || !readme.includes(END)) {
  throw new Error('README.md is missing the CATALOG:START / CATALOG:END markers.');
}
writeFileSync('README.md', readme.replace(new RegExp(`${START}[\\s\\S]*${END}`), block));
console.log(`Index rebuilt: ${items.length} item(s).`);
