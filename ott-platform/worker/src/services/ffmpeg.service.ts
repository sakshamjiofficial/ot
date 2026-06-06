import ffmpeg           from 'fluent-ffmpeg';
import * as fs           from 'fs-extra';
import * as path         from 'path';
import { jobLogger }     from '../utils/logger';
import {
  RENDITION_PROFILES,
  RenditionProfile,
  RenditionResult,
  SubtitleResult,
  AudioTrackResult,
} from '../types/job.types';
import {
  outputDir,
  thumbnailsDir,
  subtitlesDir,
  listSegments,
} from '../utils/file-utils';

// ─── Probe ────────────────────────────────────────────────────

export interface VideoProbe {
  durationSecs: number;
  width:        number;
  height:       number;
  videoCodec:   string;
  audioStreams:  AudioStreamInfo[];
  subtitleStreams: SubtitleStreamInfo[];
  fileSizeBytes: number;
  fps:           number;
  bitrate:       number;
}

export interface AudioStreamInfo {
  index:        number;
  codec:        string;
  language:     string;
  title:        string;
  channels:     number;
  sampleRate:   number;
  isDefault:    boolean;
}

export interface SubtitleStreamInfo {
  index:    number;
  language: string;
  title:    string;
  codec:    string;
  isDefault: boolean;
}

export async function probeVideo(inputPath: string): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return reject(new Error(`FFprobe failed: ${err.message}`));

      const videoStream = meta.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found in input'));

      const audioStreams: AudioStreamInfo[] = meta.streams
        .filter((s) => s.codec_type === 'audio')
        .map((s, i) => ({
          index:      s.index,
          codec:      s.codec_name || 'aac',
          language:   s.tags?.language || (i === 0 ? 'und' : `unk${i}`),
          title:      s.tags?.title   || '',
          channels:   s.channels      || 2,
          sampleRate: parseInt(s.sample_rate as any) || 44100,
          isDefault:  s.disposition?.default === 1,
        }));

      const subtitleStreams: SubtitleStreamInfo[] = meta.streams
        .filter((s) => s.codec_type === 'subtitle')
        .map((s) => ({
          index:     s.index,
          language:  s.tags?.language || 'und',
          title:     s.tags?.title    || '',
          codec:     s.codec_name     || 'subrip',
          isDefault: s.disposition?.default === 1,
        }));

      const fps = (() => {
        const rStr = videoStream.r_frame_rate || '25/1';
        const [n, d] = rStr.split('/').map(Number);
        return d ? Math.round(n / d) : 25;
      })();

      resolve({
        durationSecs:    parseFloat(meta.format.duration as any) || 0,
        width:           videoStream.width  || 1920,
        height:          videoStream.height || 1080,
        videoCodec:      videoStream.codec_name || 'h264',
        audioStreams,
        subtitleStreams,
        fileSizeBytes:   parseInt(meta.format.size as any) || 0,
        fps,
        bitrate:         parseInt(meta.format.bit_rate as any) || 0,
      });
    });
  });
}

// ─── Select rendition profiles based on source resolution ────

export function selectRenditions(
  sourceHeight:  number,
  requested:     string[],
): RenditionProfile[] {
  return RENDITION_PROFILES.filter((p) => {
    // Never upscale — skip profiles taller than source
    if (p.height > sourceHeight + 20) return false;
    return requested.includes(p.name);
  });
}

// ─── HLS Transcoding ─────────────────────────────────────────

/**
 * Transcode a single rendition to HLS.
 * Outputs: {outDir}/{resolution}/index.m3u8 + seg_NNNN.ts
 */
export async function transcodeRendition(
  inputPath:  string,
  jobId:      string,
  profile:    RenditionProfile,
  fps:        number,
  onProgress: (pct: number) => void,
): Promise<RenditionResult> {
  const log    = jobLogger(jobId);
  const outD   = path.join(outputDir(jobId), profile.name);
  await fs.ensureDir(outD);

  const playlist = path.join(outD, 'index.m3u8');
  const segPattern = path.join(outD, 'seg_%04d.ts');

  log.info(`Transcoding ${profile.name}: ${profile.videoBr} video / ${profile.audioBr} audio`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // ── Video codec ────────────────────────────────────
      .videoCodec('libx264')
      .addOutputOption('-profile:v', 'high')
      .addOutputOption('-level', '4.1')
      .addOutputOption('-preset', 'faster')        // balance quality/speed on CX23
      .addOutputOption('-crf', String(profile.crf))
      .addOutputOption('-maxrate', profile.maxrate)
      .addOutputOption('-bufsize', profile.bufsize)
      .addOutputOption('-b:v', profile.videoBr)
      // ── Scaling ────────────────────────────────────────
      // vf scale: preserve AR, round to even, pad to exact size
      .addOutputOption(
        '-vf',
        `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,` +
        `pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`,
      )
      // ── Audio ──────────────────────────────────────────
      .audioCodec('aac')
      .audioBitrate(profile.audioBr)
      .audioChannels(2)
      .audioFrequency(44100)
      // ── GOP for HLS ────────────────────────────────────
      // Keyframe every 6 seconds = seg duration; HLS needs IDR at each segment
      .addOutputOption('-g',         String(fps * 6 || 150))
      .addOutputOption('-keyint_min', String(fps * 6 || 150))
      .addOutputOption('-sc_threshold', '0')
      // ── Threading ──────────────────────────────────────
      .addOutputOption('-threads', process.env.FFMPEG_THREADS || '0')  // 0 = auto
      // ── HLS output ─────────────────────────────────────
      .addOutputOption('-f',                    'hls')
      .addOutputOption('-hls_time',             '6')         // 6-second segments
      .addOutputOption('-hls_playlist_type',    'vod')
      .addOutputOption('-hls_segment_type',     'mpegts')
      .addOutputOption('-hls_segment_filename', segPattern)
      .addOutputOption('-hls_flags',            'independent_segments')
      .addOutputOption('-hls_list_size',        '0')         // include all segments
      .addOutputOption('-movflags',             '+faststart')
      // ── Map: video stream 0 + first audio ──────────────
      .addOutputOption('-map', '0:v:0')
      .addOutputOption('-map', '0:a:0')
      .output(playlist)
      .on('start', (cmd) => log.debug(`FFmpeg cmd: ${cmd}`))
      .on('progress', (p) => {
        const pct = p.percent ? Math.min(Math.round(p.percent), 99) : 0;
        onProgress(pct);
      })
      .on('error', (err) => {
        log.error(`FFmpeg error (${profile.name}): ${err.message}`);
        reject(new Error(`Transcoding failed for ${profile.name}: ${err.message}`));
      })
      .on('end', async () => {
        log.info(`Transcoding complete: ${profile.name}`);
        const segments = await listSegments(outD);
        const sizes    = await Promise.all(
          segments.map(async (s) => (await fs.stat(s)).size),
        );
        const totalBytes = sizes.reduce((a, b) => a + b, 0);
        const bitrateKbps = Math.round(
          parseInt(profile.videoBr) + parseInt(profile.audioBr),
        );

        resolve({
          resolution:    profile.name,
          playlistUrl:   playlist,   // local path; caller replaces with R2 URL
          bitrateKbps,
          fileSizeBytes: totalBytes,
        });
      })
      .run();
  });
}

// ─── Master Playlist Generator ────────────────────────────────

/**
 * Builds the master.m3u8 from completed renditions.
 * Uses R2 URLs for playlist references.
 */
export function buildMasterPlaylist(
  renditions:   RenditionResult[],
  r2BasePath:   string,
  audioTracks:  AudioTrackResult[],
  subtitles:    SubtitleResult[],
): string {
  const cdnBase = process.env.CF_R2_PUBLIC_URL || `https://${process.env.CF_R2_BUCKET}.r2.dev`;
  const lines: string[] = ['#EXTM3U', '#EXT-X-VERSION:6', ''];

  // ── Audio track declarations ──────────────────────────────
  audioTracks.forEach((track, i) => {
    const isDefault = track.isDefault ? 'YES' : 'NO';
    lines.push(
      `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="${track.languageCode}",` +
      `NAME="${track.languageName}",DEFAULT=${isDefault},AUTOSELECT=YES,` +
      `URI="${cdnBase}/${r2BasePath}audio/${track.languageCode}.m3u8"`,
    );
  });

  // ── Subtitle declarations ─────────────────────────────────
  subtitles.forEach((sub) => {
    const isDefault = sub.isDefault ? 'YES' : 'NO';
    lines.push(
      `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="${sub.languageCode}",` +
      `NAME="${sub.languageName}",DEFAULT=${isDefault},AUTOSELECT=NO,FORCED=NO,` +
      `URI="${cdnBase}/${r2BasePath}subtitles/${sub.languageCode}.vtt"`,
    );
  });

  if (audioTracks.length || subtitles.length) lines.push('');

  // Profile order: highest to lowest bandwidth (player picks best for connection)
  const profileMap: Record<string, { width: number; height: number }> = {
    '1080p': { width: 1920, height: 1080 },
    '720p':  { width: 1280, height: 720  },
    '480p':  { width: 854,  height: 480  },
    '360p':  { width: 640,  height: 360  },
  };

  const sorted = [...renditions].sort((a, b) => b.bitrateKbps - a.bitrateKbps);

  sorted.forEach((r) => {
    const dim   = profileMap[r.resolution] || { width: 1280, height: 720 };
    const bw    = r.bitrateKbps * 1000;
    const audio = audioTracks.length ? ',AUDIO="audio"' : '';
    const subs  = subtitles.length   ? ',SUBTITLES="subs"' : '';

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bw},AVERAGE-BANDWIDTH=${Math.round(bw * 0.85)},` +
      `RESOLUTION=${dim.width}x${dim.height},CODECS="avc1.640028,mp4a.40.2"` +
      `${audio}${subs}`,
    );
    lines.push(`${cdnBase}/${r2BasePath}${r.resolution}/index.m3u8`);
  });

  return lines.join('\n') + '\n';
}

// ─── Multi-audio Extraction ───────────────────────────────────

/**
 * Extracts each audio stream as a separate AAC file and HLS playlist.
 * Skips if only one audio track (already muxed into video renditions).
 */
export async function extractAudioTracks(
  inputPath:    string,
  jobId:        string,
  probe:        VideoProbe,
): Promise<AudioTrackResult[]> {
  const log     = jobLogger(jobId);
  const results: AudioTrackResult[] = [];

  if (probe.audioStreams.length <= 1) {
    // Single audio track — it's already muxed
    const stream = probe.audioStreams[0];
    if (stream) {
      results.push({
        languageCode: normalizeLanguage(stream.language),
        languageName: languageName(stream.language),
        isDefault:    true,
        codec:        'aac',
      });
    }
    return results;
  }

  for (const stream of probe.audioStreams) {
    const langCode = normalizeLanguage(stream.language);
    const outDir   = path.join(outputDir(jobId), 'audio', langCode);
    await fs.ensureDir(outDir);

    const outFile    = path.join(outDir, 'index.m3u8');
    const segPattern = path.join(outDir, 'seg_%04d.ts');

    log.info(`Extracting audio track: ${langCode} (stream index ${stream.index})`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .addOutputOption('-map', `0:${stream.index}`)
        .audioCodec('aac')
        .audioBitrate('128k')
        .audioChannels(Math.min(stream.channels, 2))
        .addOutputOption('-f',                    'hls')
        .addOutputOption('-hls_time',             '6')
        .addOutputOption('-hls_playlist_type',    'vod')
        .addOutputOption('-hls_segment_filename', segPattern)
        .addOutputOption('-hls_list_size',        '0')
        .output(outFile)
        .on('error', reject)
        .on('end',   () => resolve())
        .run();
    });

    results.push({
      languageCode: langCode,
      languageName: languageName(stream.language),
      isDefault:    stream.isDefault || results.length === 0,
      codec:        'aac',
    });
  }

  return results;
}

// ─── Subtitle Extraction ──────────────────────────────────────

/**
 * Extracts embedded subtitle streams to WebVTT files.
 */
export async function extractSubtitles(
  inputPath: string,
  jobId:     string,
  probe:     VideoProbe,
): Promise<SubtitleResult[]> {
  const log     = jobLogger(jobId);
  const subDir  = subtitlesDir(jobId);
  await fs.ensureDir(subDir);
  const results: SubtitleResult[] = [];

  for (const sub of probe.subtitleStreams) {
    const langCode = normalizeLanguage(sub.language);
    const outFile  = path.join(subDir, `${langCode}.vtt`);

    log.info(`Extracting subtitle: ${langCode} (stream ${sub.index})`);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .addOutputOption('-map', `0:${sub.index}`)
          .format('webvtt')
          .output(outFile)
          .on('error', (err) => {
            // Non-fatal — image-based subtitles (PGS, VOBSUB) can't be converted
            log.warn(`Subtitle extract failed (${langCode}): ${err.message}`);
            resolve();
          })
          .on('end', () => resolve())
          .run();
      });

      if (await fs.pathExists(outFile)) {
        results.push({
          languageCode: langCode,
          languageName: languageName(sub.language),
          vttUrl:       outFile,   // local path; caller replaces with R2 URL
          isDefault:    sub.isDefault || results.length === 0,
        });
      }
    } catch {
      // Continue with next subtitle
    }
  }

  return results;
}

// ─── Language helpers ─────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  eng: 'English', hin: 'Hindi', tam: 'Tamil', tel: 'Telugu',
  mal: 'Malayalam', kan: 'Kannada', ben: 'Bengali', mar: 'Marathi',
  guj: 'Gujarati', pan: 'Punjabi', urd: 'Urdu', fra: 'French',
  deu: 'German', spa: 'Spanish', por: 'Portuguese', jpn: 'Japanese',
  kor: 'Korean', zho: 'Chinese', ara: 'Arabic', und: 'Unknown',
};

const ISO2_MAP: Record<string, string> = {
  en: 'eng', hi: 'hin', ta: 'tam', te: 'tel', ml: 'mal',
  kn: 'kan', bn: 'ben', mr: 'mar', gu: 'guj', pa: 'pan',
  ur: 'urd', fr: 'fra', de: 'deu', es: 'spa', pt: 'por',
  ja: 'jpn', ko: 'kor', zh: 'zho', ar: 'ara',
};

export function normalizeLanguage(lang: string): string {
  if (!lang || lang === 'und') return 'und';
  const lower = lang.toLowerCase().slice(0, 3);
  return ISO2_MAP[lower] || lower;
}

export function languageName(lang: string): string {
  const code = normalizeLanguage(lang);
  return LANG_MAP[code] || lang;
}
