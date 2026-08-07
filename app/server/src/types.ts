// Shared shapes for the frontend/backend contract. The catalog schema
// (catalog/schema.ts) validates what lives in git; these are what the API
// returns after merging catalog data with engagement state and live LD state.

export type DemoStatus = 'published' | 'pending' | 'draft';
export type FlagKind = 'boolean' | 'multivariate';

export interface FlagVariation {
  value?: unknown; // optional to match zod's inference of z.unknown()
  name: string;
}

/** A flag as defined in the catalog (defaults, no live state). */
export interface CatalogFlag {
  key: string;
  name: string;
  description: string;
  kind: FlagKind;
  defaultValue?: unknown; // optional to match zod's inference of z.unknown()
  variations: FlagVariation[];
}

/** A flag with live environment state attached (split-view panel). */
export interface Flag extends CatalogFlag {
  currentValue: unknown;
  launchDarklyUrl: string;
  /** 'launchdarkly' = live REST state; 'local' = demo-mode overrides. */
  source: 'launchdarkly' | 'local';
}

export interface DemoAuthor {
  name: string;
  email: string;
  /** CSS gradient used as the avatar background in the design. */
  avatarColor: string;
  initials: string;
}

export interface DemoRepo {
  owner: string;
  name: string;
  path?: string;
  branch: string;
  htmlUrl: string;
  cloneUrl: string;
  forkUrl: string;
}

export interface DemoLaunchDarkly {
  projectKey: string;
  environmentKey: string;
  flags: CatalogFlag[];
}

export interface Demo {
  id: string;
  slug: string;
  title: string;
  /** 1–2 letter monogram shown on the card art. */
  mono: string;
  /** CSS gradient for the card art. */
  gradient: string;
  description: string;
  longDescription: string[];
  tags: string[];
  customer?: string | null;
  category: string;
  techStack: string[];
  author: DemoAuthor;
  createdAt: string;
  updatedAt: string;
  status: DemoStatus;
  repo: DemoRepo;
  liveDemoUrl: string | null;
  launchDarkly: DemoLaunchDarkly | null;
  metrics: { viewCount: number; likeCount: number };
  likedByCurrentUser: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export type ActivityVerb = 'viewed' | 'liked' | 'opened split view on' | 'forked' | 'cloned' | 'submitted';

export interface ActivityItem {
  who: string;
  initials: string;
  verb: ActivityVerb;
  demoId: string;
  demoTitle: string;
  at: string;
}

export interface DashboardStats {
  totalDemos: number;
  published: number;
  pending: number;
  totalViews: number;
  totalLikes: number;
  avgViews: number;
  flaggedCount: number;
  totalFlags: number;
  flagPct: number;
  contributors: number;
  topDemos: Array<{ id: string; title: string; mono: string; gradient: string; views: number }>;
  categories: Array<{ name: string; count: number; views: number }>;
  tech: Array<{ name: string; count: number }>;
  topContributors: Array<{ name: string; initials: string; color: string; demos: number; views: number; likes: number }>;
  activity: ActivityItem[];
}

export interface InternalTool {
  id: string;
  mono: string;
  name: string;
  description: string;
  bg: string;
  url: string;
}

export interface SubmissionResult {
  prUrl: string;
  prNumber: number;
  status: 'pr_opened';
  demoId: string;
}
