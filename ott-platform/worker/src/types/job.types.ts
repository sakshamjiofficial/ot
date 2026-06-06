// ─── Queue Names ─────────────────────────────────────────────
export const QUEUES = {
  TRANSCODE: 'transcode',
  THUMBNAIL: 'thumbnail',
  UPLOAD:    'upload-cleanup',
} as const;

// ─── Job Names ────────────────────────────────────────────────
export const JOBS = {
  TRANSCODE_VIDEO:    'transcode-video',
  GENERATE_THUMBNAILS:'generate-thumbnails',
  GENERATE_SPRITE:    'generate-sprite',
  EXTRACT_SUBTITLES:  'extract-subtitles',
  CLEANUP_UPLOAD:     'cleanup-upload',
} as const;

// ─── Resolutions ─────────────────────────────────────────────
export interface RenditionProfile {
  name:       string;       // '1080p'
  width:      number;
  height:     number;
  videoBr:    string;       // '5000k'
  audioBr:    string;       // '192k'
  crf:        number;
  maxrate:    string;
  bufsize:    string;
}

export const RENDITION_PROFILES: RenditionProfile[] = [
  {
    name:    '1080p',
    width:   1920, height: 1080,
    videoBr: '5000k', audioBr: '192k',
    crf: 23, maxrate: '5350k', bufsize: '7500k',
  },
  {
    name:    '720p',
    width:   1280, height: 720,
    videoBr: '2800k', audioBr: '128k',
    crf: 23, maxrate: '3000k', bufsize: '4200k',
  },
  {
    name:    '480p',
    width:   854,  height: 480,
    videoBr: '1400k', audioBr: '128k',
    crf: 24, maxrate: '1500k', bufsize: '2100k',
  },
  {
    name:    '360p',
    width:   640,  height: 360,
    videoBr: '800k', audioBr: '96k',
    crf: 25, maxrate: '856k', bufsize: '1200k',
  },
];

// ─── Job Payloads ─────────────────────────────────────────────
export interface TranscodeJobPayload {
  jobId:            string;    // transcoding_jobs.id (DB)
  videoAssetId:     string;    // video_assets.id
  contentId?:       string;
  episodeId?:       string;
  inputR2Key:       string;    // raw upload key in R2
  outputR2BasePath: string;    // e.g. movies/uuid/ or series/uuid/s01/e01/
  contentType:      'movie' | 'series';
  targetRenditions: string[];  // ['1080p','720p','480p','360p']
  extractSubtitles: boolean;
  extractAudio:     boolean;
  generateSprite:   boolean;
  priority:         number;    // 1=high, 10=low
}

export interface TranscodeJobResult {
  videoAssetId: string;
  masterUrl:    string;
  renditions:   RenditionResult[];
  subtitles:    SubtitleResult[];
  audioTracks:  AudioTrackResult[];
  sprite?:      SpriteResult;
  durationSecs: number;
  fileSizeBytes: number;
}

export interface RenditionResult {
  resolution:   string;
  playlistUrl:  string;
  bitrateKbps:  number;
  fileSizeBytes: number;
}

export interface SubtitleResult {
  languageCode: string;
  languageName: string;
  vttUrl:       string;
  isDefault:    boolean;
}

export interface AudioTrackResult {
  languageCode: string;
  languageName: string;
  isDefault:    boolean;
  codec:        string;
}

export interface SpriteResult {
  spriteUrl:   string;
  vttUrl:      string;
  tileWidth:   number;
  tileHeight:  number;
  intervalSec: number;
  columns:     number;
  rows:        number;
}

// ─── Progress Events ──────────────────────────────────────────
export interface ProgressEvent {
  jobId:       string;
  stage:       TranscodeStage;
  percent:     number;   // 0-100
  currentTask: string;
  elapsedMs:   number;
}

export type TranscodeStage =
  | 'downloading'
  | 'probing'
  | 'transcoding'
  | 'thumbnails'
  | 'sprite'
  | 'subtitles'
  | 'uploading'
  | 'finalizing';
