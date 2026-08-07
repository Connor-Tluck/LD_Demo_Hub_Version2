import type { DashboardStats, Demo, DemoReadmeResult, Flag, InternalTool, SubmissionPayload, SubmissionResult, User } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error?: string; message?: string },
  ) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listDemos: (params: { search?: string; category?: string; hasFlags?: boolean; sort?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.category && params.category !== 'All') q.set('category', params.category);
    if (params.hasFlags) q.set('hasFlags', 'true');
    if (params.sort) q.set('sort', params.sort);
    return request<{ demos: Demo[]; total: number }>(`/api/demos?${q}`);
  },
  getDemo: (id: string) => request<Demo>(`/api/demos/${id}`),
  getDemoReadme: (id: string) => request<DemoReadmeResult>(`/api/demos/${id}/readme`),
  like: (id: string) => request<{ likeCount: number; likedByCurrentUser: boolean }>(`/api/demos/${id}/like`, { method: 'POST' }),
  view: (id: string, context: 'detail' | 'split') =>
    request<{ viewCount: number }>(`/api/demos/${id}/view`, { method: 'POST', body: JSON.stringify({ context }) }),
  event: (id: string, type: 'fork' | 'clone' | 'source' | 'split') =>
    request<{ ok: boolean }>(`/api/demos/${id}/events`, { method: 'POST', body: JSON.stringify({ type }) }),
  getFlags: (id: string) => request<Flag[]>(`/api/demos/${id}/flags`),
  setFlag: (id: string, key: string, value: unknown) =>
    request<Flag>(`/api/demos/${id}/flags/${key}`, { method: 'POST', body: JSON.stringify({ value }) }),
  resetEnvironment: (id: string) =>
    request<{ reset: boolean; flags: Flag[] }>(`/api/demos/${id}/environment/reset`, { method: 'POST' }),
  submit: (payload: SubmissionPayload) =>
    request<SubmissionResult>('/api/demos', { method: 'POST', body: JSON.stringify(payload) }),
  submitUpload: async (payload: SubmissionPayload, files: FileList) => {
    const body = new FormData();
    body.append('payload', JSON.stringify({ ...payload, sourceType: 'upload' }));
    Array.from(files).forEach((file) => body.append('files', file, file.name));
    const res = await fetch('/api/demos/upload', { method: 'POST', body });
    if (!res.ok) {
      let errBody: { error?: string; message?: string } = {};
      try {
        errBody = await res.json();
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, errBody);
    }
    return res.json() as Promise<SubmissionResult>;
  },
  dashboard: () => request<DashboardStats>('/api/dashboard'),
  tools: () => request<{ tools: InternalTool[] }>('/api/tools'),
  me: () => request<User>('/api/me'),
  config: () =>
    request<{ ldProjectKey: string; ldEnvironmentKey: string; galleryRepo: string; categories: string[] }>(
      '/api/config',
    ),
};
