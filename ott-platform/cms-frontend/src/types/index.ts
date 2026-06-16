// ─── Auth ──────────────────────────────────────────────────────

export interface User {
  id:              string;
  email:           string;
  displayName:     string;
  avatarUrl?:      string;
  role:            'user' | 'admin' | 'superadmin';
  isActive:        boolean;
  isEmailVerified: boolean;
  lastLoginAt?:    string;
  createdAt:       string;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

export interface AuthResult {
  user:   User;
  tokens: AuthTokens;
}

// ─── Content ───────────────────────────────────────────────────

export type ContentType   = 'movie' | 'series';
export type ContentStatus = 'draft' | 'processing' | 'published' | 'scheduled' | 'archived';
export type Resolution    = '360p' | '480p' | '720p' | '1080p';

export interface Genre {
  id:        number;
  name:      string;
  slug:      string;
  sortOrder: number;
}

export interface VideoRendition {
  id:           string;
  resolution:   Resolution;
  bitrateKbps:  number;
  playlistUrl:  string;
  fileSizeBytes: number;
}

export interface Subtitle {
  id:           string;
  languageCode: string;
  languageName: string;
  vttUrl:       string;
  isDefault:    boolean;
}

export interface AudioTrack {
  id:           string;
  languageCode: string;
  languageName: string;
  isDefault:    boolean;
}

export interface VideoAsset {
  id:               string;
  masterUrl?:       string;
  durationSeconds?: number;
  fileSizeBytes?:   number;
  originalFilename?: string;
  renditions:       VideoRendition[];
  subtitles:        Subtitle[];
  audioTracks:      AudioTrack[];
  createdAt:        string;
}

export interface Season {
  id:            string;
  seasonNumber:  number;
  title?:        string;
  totalEpisodes: number;
  episodes:      Episode[];
  createdAt:     string;
}

export interface Episode {
  id:              string;
  episodeNumber:   number;
  title:           string;
  description?:    string;
  durationSeconds?: number;
  thumbnailUrl?:   string;
  status:          ContentStatus;
  isPremium:       boolean;
  introStartSec?:  number;
  introEndSec?:    number;
  publishedAt?:    string;
  videoAssets:     VideoAsset[];
  createdAt:       string;
}

export interface Content {
  id:               string;
  type:             ContentType;
  title:            string;
  slug:             string;
  description?:     string;
  shortDescription?: string;
  language:         string;
  releaseYear?:     number;
  durationSeconds?: number;
  ageRating?:       string;
  status:           ContentStatus;
  isPremium:        boolean;
  isFeatured:       boolean;
  isTrending:       boolean;
  imdbRating?:      number;
  trailerUrl?:      string;
  posterUrl?:       string;
  bannerUrl?:       string;
  thumbnailUrl?:    string;
  featurePosterUrl?:    string;
  featureTextImageUrl?: string;
  totalPlays:       number;
  totalWatchSeconds: number;
  scheduledAt?:     string;
  publishedAt?:     string;
  genres:           Genre[];
  seasons?:         Season[];
  videoAssets:      VideoAsset[];
  createdAt:        string;
  updatedAt:        string;
}

// ─── Transcoding ───────────────────────────────────────────────

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface TranscodingJob {
  id:               string;
  videoAssetId:     string;
  bullmqJobId?:     string;
  status:           JobStatus;
  priority:         number;
  progress:         number;
  errorMessage?:    string;
  retryCount:       number;
  workerId?:        string;
  startedAt?:       string;
  completedAt?:     string;
  createdAt:        string;
  updatedAt:        string;
  originalFilename?: string;
  contentId?:       string;
  episodeId?:       string;
}

export interface QueueStats {
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
  delayed:   number;
}

// ─── Upload ────────────────────────────────────────────────────

export interface UploadInitResponse {
  uploadId:     string;
  key:          string;
  videoAssetId: string;
  partUrls:     string[];
  cdnBase:      string;
}

export interface UploadedPart {
  PartNumber: number;
  ETag:       string;
}

// ─── Users ─────────────────────────────────────────────────────

export interface AdminUser {
  id:                  string;
  email:               string;
  displayName?:        string;
  phone?:              string;
  avatarUrl?:          string;
  role:                string;
  isActive:            boolean;
  isEmailVerified:     boolean;
  lastLoginAt?:        string;
  createdAt:           string;
  hasActiveSubscription?: boolean;
  subscriptionExpiry?: string;
}

// ─── Analytics / Dashboard ─────────────────────────────────────

export interface DashboardStats {
  totalUsers:      number;
  activeUsers:     number;
  newUsersToday:   number;
  totalMovies:     number;
  totalSeries:     number;
  published:       number;
  processing:      number;
  queueStats:      QueueStats;
  topContent:      { title: string; plays: number; id: string }[];
}

export interface PlayStat {
  date:   string;
  plays:  number;
  users:  number;
}

// ─── Pagination ────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data:  T[];
  meta: {
    total:      number;
    page:       number;
    limit:      number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data:    T;
  message?: string;
  meta?:   Record<string, any>;
}

// ─── Banner ────────────────────────────────────────────────────

export interface Banner {
  id:         string;
  title?:     string;
  imageUrl:   string;
  linkType?:  string;
  linkValue?: string;
  sortOrder:  number;
  isActive:   boolean;
  startsAt?:  string;
  endsAt?:    string;
}

// ─── Notifications ─────────────────────────────────────────────

export interface NotificationPayload {
  title:   string;
  body:    string;
  type?:   string;
  data?:   Record<string, any>;
  topic?:  string;
  userIds?: string[];
}

// ─── Subscription Plan ──────────────────────────────────────────

export interface SubscriptionPlan {
  id: number;
  name: string;
  planType: string;
  priceInr: number;
  durationDays: number;
  maxDevices?: number;
  maxQuality?: string;
  isActive: boolean;
}

