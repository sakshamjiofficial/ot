import ffmpeg           from 'fluent-ffmpeg';
import sharp            from 'sharp';
import * as fs          from 'fs-extra';
import * as path        from 'path';
import { jobLogger }    from '../utils/logger';
import { thumbnailsDir } from '../utils/file-utils';
import { SpriteResult }  from '../types/job.types';

// ─── Single frame thumbnails ──────────────────────────────────

export interface ThumbnailSet {
  poster:   string;   // 300x450  WebP portrait
  banner:   string;   // 1280x720 WebP landscape
  thumb:    string;   // 320x180  WebP small 16:9
}

/**
 * Extract key frames at various timestamps and resize to production sizes.
 */
export async function generateThumbnails(
  inputPath: string,
  jobId:     string,
  durationSecs: number,
): Promise<ThumbnailSet> {
  const log   = jobLogger(jobId);
  const tDir  = thumbnailsDir(jobId);
  await fs.ensureDir(tDir);

  // Sample at 10%, 25%, and 40% of duration for best visual selection
  // Use the 25% mark as the primary thumbnail
  const sampleAt  = Math.floor(durationSecs * 0.25);
  const rawFrame  = path.join(tDir, 'frame_raw.jpg');

  log.info(`Extracting thumbnail frame at ${sampleAt}s`);

  await extractFrame(inputPath, rawFrame, sampleAt);

  const rawBuffer = await fs.readFile(rawFrame);

  // ── Poster  300×450 (portrait) ─────────────────────────────
  const posterPath = path.join(tDir, 'poster.webp');
  await sharp(rawBuffer)
    .resize(300, 450, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toFile(posterPath);

  // ── Banner 1280×720 (landscape) ────────────────────────────
  const bannerPath = path.join(tDir, 'banner.webp');
  await sharp(rawBuffer)
    .resize(1280, 720, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toFile(bannerPath);

  // ── Thumb  320×180 (small 16:9) ────────────────────────────
  const thumbPath = path.join(tDir, 'thumb.webp');
  await sharp(rawBuffer)
    .resize(320, 180, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(thumbPath);

  // Cleanup raw frame
  await fs.remove(rawFrame);

  log.info('Thumbnail generation complete: poster / banner / thumb');
  return { poster: posterPath, banner: bannerPath, thumb: thumbPath };
}

// ─── Sprite sheet for seek preview ───────────────────────────

const SPRITE_INTERVAL   = 10;    // capture every 10 seconds
const SPRITE_TILE_W     = 160;
const SPRITE_TILE_H     = 90;
const SPRITE_COLS       = 10;

/**
 * Generates a seek-preview sprite sheet + companion WebVTT file.
 *
 * Sprite layout:  SPRITE_COLS tiles per row, rows = ceil(frames / SPRITE_COLS)
 * WebVTT format:  timestamp → sprite.jpg#xywh=X,Y,W,H
 */
export async function generateSpriteSheet(
  inputPath:    string,
  jobId:        string,
  durationSecs: number,
): Promise<SpriteResult> {
  const log   = jobLogger(jobId);
  const tDir  = thumbnailsDir(jobId);
  const frDir = path.join(tDir, 'sprite-frames');
  await fs.ensureDir(frDir);

  const frameCount = Math.floor(durationSecs / SPRITE_INTERVAL);
  const rows       = Math.ceil(frameCount / SPRITE_COLS);

  log.info(`Generating sprite: ${frameCount} frames @ ${SPRITE_INTERVAL}s intervals`);

  // ── Extract all frames with FFmpeg ─────────────────────────
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .addOutputOption('-vf', [
        // Select 1 frame every SPRITE_INTERVAL seconds
        `select=not(mod(t\\,${SPRITE_INTERVAL}))`,
        // Scale to tile size
        `scale=${SPRITE_TILE_W}:${SPRITE_TILE_H}`,
      ].join(','))
      .addOutputOption('-vsync', 'vfr')
      .addOutputOption('-q:v',   '4')    // JPEG quality
      .output(path.join(frDir, 'frame_%04d.jpg'))
      .on('error', reject)
      .on('end',   () => resolve())
      .run();
  });

  // ── Collect extracted frames ────────────────────────────────
  const frameFiles = (await fs.readdir(frDir))
    .filter((f) => f.endsWith('.jpg'))
    .sort();

  if (frameFiles.length === 0) {
    throw new Error('No sprite frames extracted');
  }

  // ── Compose sprite sheet with Sharp ────────────────────────
  const actualRows  = Math.ceil(frameFiles.length / SPRITE_COLS);
  const spriteW     = SPRITE_COLS  * SPRITE_TILE_W;
  const spriteH     = actualRows   * SPRITE_TILE_H;

  const compositeInput: sharp.OverlayOptions[] = [];

  for (let i = 0; i < frameFiles.length; i++) {
    const col  = i % SPRITE_COLS;
    const row  = Math.floor(i / SPRITE_COLS);
    const buf  = await fs.readFile(path.join(frDir, frameFiles[i]));

    compositeInput.push({
      input: buf,
      left:  col * SPRITE_TILE_W,
      top:   row * SPRITE_TILE_H,
    });
  }

  const spritePath = path.join(tDir, 'sprite.jpg');

  await sharp({
    create: {
      width:      spriteW,
      height:     spriteH,
      channels:   3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite(compositeInput)
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(spritePath);

  // ── Build WebVTT ────────────────────────────────────────────
  const vttPath     = path.join(tDir, 'sprite.vtt');
  const cdnBase     = process.env.CF_R2_PUBLIC_URL || `https://${process.env.CF_R2_BUCKET}.r2.dev`;
  const spriteLines: string[] = ['WEBVTT', ''];

  for (let i = 0; i < frameFiles.length; i++) {
    const startSec   = i       * SPRITE_INTERVAL;
    const endSec     = (i + 1) * SPRITE_INTERVAL;
    const col        = i % SPRITE_COLS;
    const row        = Math.floor(i / SPRITE_COLS);
    const xywh       = `${col * SPRITE_TILE_W},${row * SPRITE_TILE_H},${SPRITE_TILE_W},${SPRITE_TILE_H}`;

    spriteLines.push(
      `${formatVttTime(startSec)} --> ${formatVttTime(endSec)}`,
      // Placeholder URL — replaced with R2 URL by the processor after upload
      `__SPRITE_URL__#xywh=${xywh}`,
      '',
    );
  }

  await fs.writeFile(vttPath, spriteLines.join('\n'));

  // Cleanup frame directory
  await fs.remove(frDir);

  log.info(`Sprite generated: ${frameFiles.length} tiles (${actualRows} rows × ${SPRITE_COLS} cols)`);

  return {
    spriteUrl:   spritePath,   // local path; processor replaces with R2 URL
    vttUrl:      vttPath,
    tileWidth:   SPRITE_TILE_W,
    tileHeight:  SPRITE_TILE_H,
    intervalSec: SPRITE_INTERVAL,
    columns:     SPRITE_COLS,
    rows:        actualRows,
  };
}

// ─── Blur placeholder (tiny base64 WebP) ─────────────────────

/**
 * Generates a 32×18 blurred placeholder as a base64 data URI.
 * Used as low-quality image placeholder (LQIP) before the real image loads.
 */
export async function generateBlurPlaceholder(imagePath: string): Promise<string> {
  const buf = await sharp(imagePath)
    .resize(32, 18, { fit: 'cover' })
    .blur(2)
    .webp({ quality: 20 })
    .toBuffer();

  return `data:image/webp;base64,${buf.toString('base64')}`;
}

// ─── Helpers ──────────────────────────────────────────────────

async function extractFrame(
  inputPath:  string,
  outputPath: string,
  atSeconds:  number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(atSeconds)
      .frames(1)
      .addOutputOption('-q:v', '2')
      .output(outputPath)
      .on('error', reject)
      .on('end',   () => resolve())
      .run();
  });
}

function formatVttTime(secs: number): string {
  const h   = Math.floor(secs / 3600);
  const m   = Math.floor((secs % 3600) / 60);
  const s   = Math.floor(secs % 60);
  const ms  = Math.round((secs % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
