import { apiGet, apiPost, apiPut, apiDelete, apiClient } from './client';
import type {
  AuthResult, Content, Genre, TranscodingJob, QueueStats,
  AdminUser, DashboardStats, Banner, NotificationPayload,
  UploadInitResponse, UploadedPart, SubscriptionPlan,
} from '@/types';

// ─── Auth ──────────────────────────────────────────────────────

export const authApi = {
  login:    (email: string, password: string) =>
    apiPost<AuthResult>('/auth/login', { email, password }),
  me:       () => apiGet<AuthResult['user']>('/auth/me'),
  logout:   () => apiPost<void>('/auth/logout'),
  refresh:  (refreshToken: string) =>
    apiPost<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/auth/refresh', { refreshToken },
    ),
};

// ─── Content ───────────────────────────────────────────────────

export const contentApi = {
  listMovies:  (params?: Record<string, any>) => apiGet<any>('/admin/content', { ...params, type: 'movie' }),
  listSeries:  (params?: Record<string, any>) => apiGet<any>('/admin/content', { ...params, type: 'series' }),
  getById:     (id: string)  => apiGet<Content>(`/admin/content/${id}`),
  create:      (data: any)   => apiPost<Content>('/admin/content', data),
  update:      (id: string, data: any) => apiPut<Content>(`/admin/content/${id}`, data),
  delete:      (id: string)  => apiDelete(`/admin/content/${id}`),
  stats:       ()            => apiGet<any>('/admin/content/stats'),
  getTrending: ()            => apiGet<Content[]>('/home/trending'),

  // Seasons
  createSeason: (contentId: string, data: any) =>
    apiPost(`/admin/series/${contentId}/seasons`, data),
  getSeasons:   (contentId: string) => apiGet<any>(`/series/${contentId}/seasons`),

  // Episodes
  createEpisode: (seasonId: string, contentId: string, data: any) =>
    apiPost(`/admin/seasons/${seasonId}/episodes?contentId=${contentId}`, data),
  updateEpisode: (id: string, data: any) => apiPut(`/admin/episodes/${id}`, data),
  deleteEpisode: (id: string) => apiDelete(`/admin/episodes/${id}`),

  // Genres
  listGenres:  () => apiGet<Genre[]>('/genres'),
  createGenre: (name: string) => apiPost<Genre>('/admin/genres', { name }),
  updateGenre: (id: number, name: string, sortOrder?: number) =>
    apiPut<Genre>(`/admin/genres/${id}`, { name, sortOrder }),
  deleteGenre: (id: number) => apiDelete(`/admin/genres/${id}`),
};

// ─── Upload ────────────────────────────────────────────────────

export const uploadApi = {
  initiate: (data: {
    contentId?: string; episodeId?: string;
    filename: string; fileSize: number; mimeType: string; partCount: number;
  }) => apiPost<UploadInitResponse>('/upload/initiate', data),

  complete: (data: {
    uploadId: string; key: string; videoAssetId: string;
    parts: UploadedPart[]; autoTranscode?: boolean;
  }) => apiPost<{ url: string; jobId?: string }>('/upload/complete', data),

  abort: (key: string, uploadId: string) =>
    apiDelete(`/upload/abort`),   // body sent separately

  status:     (videoAssetId: string) =>
    apiGet<TranscodingJob>(`/upload/status/${videoAssetId}`),
  retryJob:   (videoAssetId: string) =>
    apiPost<void>(`/upload/retry/${videoAssetId}`),
  listJobs:   (status?: string, limit = 50) =>
    apiGet<TranscodingJob[]>('/upload/jobs', { status, limit }),
  queueStats: () => apiGet<QueueStats>('/upload/queue-stats'),
};

// ─── Users ─────────────────────────────────────────────────────

export const usersApi = {
  list:           (params?: { page?: number; limit?: number; search?: string }) =>
    apiGet<any>('/users', params),
  getById:        (id: string) => apiGet<AdminUser>(`/users/${id}`),
  create:         (data: any) => apiPost<AdminUser>('/users', data),
  update:         (id: string, data: any) => apiPut<AdminUser>(`/users/${id}`, data),
  changePassword: (id: string, password: string) => apiPut<void>(`/users/${id}/password`, { password }),
  deactivate:     (id: string) => apiDelete(`/users/${id}`),
  activateSubscription: (userId: string, planId: number) => apiPost<any>(`/admin/users/${userId}/subscription`, { planId }),
  deactivateSubscription: (userId: string) => apiDelete(`/admin/users/${userId}/subscription`),
};


// ─── Banners ───────────────────────────────────────────────────

export const bannersApi = {
  list:   () => apiGet<Banner[]>('/banners'),
  create: (data: any) => apiPost<Banner>('/admin/banners', data),
  update: (id: string, data: any) => apiPut<Banner>(`/admin/banners/${id}`, data),
  delete: (id: string) => apiDelete(`/admin/banners/${id}`),
};

// ─── Dashboard ─────────────────────────────────────────────────

export const dashboardApi = {
  stats: async (): Promise<DashboardStats> => {
    const [contentStats, userStats, queueStats] = await Promise.all([
      contentApi.stats(),
      usersApi.list({ limit: 1 }),
      uploadApi.queueStats(),
    ]);

    return {
      totalUsers:    userStats?.meta?.total    ?? 0,
      activeUsers:   userStats?.meta?.total    ?? 0,
      newUsersToday: 0,
      totalMovies:   contentStats?.totalMovies  ?? 0,
      totalSeries:   contentStats?.totalSeries  ?? 0,
      published:     contentStats?.published    ?? 0,
      processing:    contentStats?.processing   ?? 0,
      queueStats:    queueStats ?? { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      topContent:    [],
    };
  },
};

// ─── Analytics ─────────────────────────────────────────────────

export const analyticsApi = {
  getOverview: () => apiGet<{
    totalUsers: number;
    activeUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    totalPlays: number;
    totalWatchSeconds: number;
  }>('/admin/analytics/overview'),
  
  getPlaybackTrends: () => apiGet<{
    date: string;
    plays: number;
    users: number;
  }[]>('/admin/analytics/trends/playback'),
  
  getSubscriptionBreakdown: () => apiGet<{
    plan_name: string;
    plan_type: string;
    count: number;
    revenue: number;
  }[]>('/admin/analytics/breakdown/subscriptions'),
  
  getRevenueTrends: () => apiGet<{
    date: string;
    revenue: number;
    signups: number;
  }[]>('/admin/analytics/trends/revenue'),
  
  getDeviceBreakdown: () => apiGet<{
    device_type: string;
    count: number;
  }[]>('/admin/analytics/breakdown/devices'),
  
  getTopContent: () => apiGet<{
    id: string;
    title: string;
    type: string;
    plays: number;
    watch_seconds: number;
  }[]>('/admin/analytics/top-content'),
  
  getSearchAnalytics: () => apiGet<{
    query: string;
    count: number;
    avg_results: number;
  }[]>('/admin/analytics/searches'),
  
  getGenrePerformance: () => apiGet<{
    genre_name: string;
    plays: number;
    watch_seconds: number;
  }[]>('/admin/analytics/genres'),
};

// ─── Notifications ─────────────────────────────────────────────

export const notificationsApi = {
  send: (payload: NotificationPayload) =>
    apiPost<void>('/admin/notifications/send', payload),
};

// ─── App Config ────────────────────────────────────────────────

export const configApi = {
  getAll: () => apiGet<Record<string, string>>('/admin/config'),
  set:    (key: string, value: string) =>
    apiPost<void>('/admin/config', { key, value }),
};

// ─── Subscription Plans ────────────────────────────────────────

export const plansApi = {
  listAll: () => apiGet<SubscriptionPlan[]>('/admin/subscriptions/plans'),
  create:  (data: any) => apiPost<SubscriptionPlan>('/admin/subscriptions/plans', data),
  update:  (id: number, data: any) => apiPut<SubscriptionPlan>(`/admin/subscriptions/plans/${id}`, data),
  delete:  (id: number) => apiDelete(`/admin/subscriptions/plans/${id}`),
};

// ─── TMDB Proxy ────────────────────────────────────────────────

export const tmdbApi = {
  search:  (query: string, type: 'movie' | 'series') =>
    apiGet<any>('/admin/tmdb/search', { query, type }),
  details: (id: number | string, type: 'movie' | 'series') =>
    apiGet<any>(`/admin/tmdb/details/${id}`, { type }),
};

// ─── Home Sections ─────────────────────────────────────────────
export const homeSectionsApi = {
  list:    () => apiGet<any[]>('/home-sections'),
  create:  (data: any) => apiPost<any>('/admin/home-sections', data),
  update:  (id: number, data: any) => apiPut<any>(`/admin/home-sections/${id}`, data),
  delete:  (id: number) => apiDelete(`/admin/home-sections/${id}`),
  reorder: (ids: number[]) => apiPut<{ success: boolean }>('/admin/home-sections/reorder', { ids }),
};


