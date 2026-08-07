// Mirrors server/src/types.ts — the frontend/backend contract.

export type DemoStatus = 'published' | 'pending' | 'draft';

export interface FlagVariation {
  value?: unknown;
  name: string;
}

export interface CatalogFlag {
  key: string;
  name: string;
  description: string;
  kind: 'boolean' | 'multivariate';
  defaultValue?: unknown;
  variations: FlagVariation[];
}

export interface Flag extends CatalogFlag {
  currentValue: unknown;
  launchDarklyUrl: string;
  source: 'launchdarkly' | 'local';
}

export interface Demo {
  id: string;
  slug: string;
  title: string;
  mono: string;
  gradient: string;
  description: string;
  longDescription: string[];
  tags: string[];
  customer?: string | null;
  category: string;
  techStack: string[];
  author: { name: string; email: string; avatarColor: string; initials: string };
  createdAt: string;
  updatedAt: string;
  status: DemoStatus;
  repo: { owner: string; name: string; path?: string; branch: string; htmlUrl: string; cloneUrl: string; forkUrl: string };
  liveDemoUrl: string | null;
  launchDarkly: { projectKey: string; environmentKey: string; flags: CatalogFlag[] } | null;
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

export interface ActivityItem {
  who: string;
  initials: string;
  verb: string;
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

export interface DemoReadmeResult {
  html: string;
  source: 'github' | 'local';
  url: string;
}

export interface SubmissionPayload {
  title: string;
  description: string;
  longDescription?: string[];
  customer?: string;
  category: string;
  tags: string[];
  techStack: string[];
  sourceType?: 'github' | 'upload';
  repo?: { url?: string; path?: string; branch: string };
  liveDemoUrl?: string | null;
  launchDarkly?: { projectKey: string; environmentKey: string; flagKeys: string[] } | null;
}
