export const TRANSCODE_QUEUE = 'transcoding';

export interface TranscodeJobData {
  jobId:        string;
  videoAssetId: string;
  rawKey:       string;           // R2 key of the raw input file
  basePath?:    string;           // R2 base folder for outputs
  contentId?:   string;
  episodeId?:   string;
}

export interface TranscodeProgress {
  jobId:    string;
  stage:    TranscodeStage;
  percent:  number;
  message?: string;
}

export enum TranscodeStage {
  DOWNLOADING    = 'downloading',
  PROBING        = 'probing',
  TRANSCODING    = 'transcoding',
  THUMBNAILS     = 'thumbnails',
  SPRITES        = 'sprites',
  SUBTITLES      = 'subtitles',
  UPLOADING      = 'uploading',
  FINALIZING     = 'finalizing',
  COMPLETE       = 'complete',
}

// HLS rendition ladder
export interface HlsRendition {
  name:        string;     // '1080p'
  resolution:  string;     // '1920x1080'
  videoBitrate: string;    // '4500k'
  audioBitrate: string;    // '192k'
  maxRate:     string;     // '4950k'
  bufSize:     string;     // '9000k'
}

export const HLS_RENDITIONS: HlsRendition[] = [
  {
    name:         '1080p',
    resolution:   '1920x1080',
    videoBitrate: '4500k',
    audioBitrate: '192k',
    maxRate:      '4950k',
    bufSize:      '9000k',
  },
  {
    name:         '720p',
    resolution:   '1280x720',
    videoBitrate: '2500k',
    audioBitrate: '128k',
    maxRate:      '2750k',
    bufSize:      '5000k',
  },
  {
    name:         '480p',
    resolution:   '854x480',
    videoBitrate: '1000k',
    audioBitrate: '128k',
    maxRate:      '1100k',
    bufSize:      '2000k',
  },
  {
    name:         '360p',
    resolution:   '640x360',
    videoBitrate: '500k',
    audioBitrate: '96k',
    maxRate:      '550k',
    bufSize:      '1000k',
  },
];
