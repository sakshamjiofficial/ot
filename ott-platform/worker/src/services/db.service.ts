import { Pool, PoolClient } from 'pg';
import { logger }           from '../utils/logger';
import { TranscodeJobResult, RenditionResult, SubtitleResult, AudioTrackResult, SpriteResult } from '../types/job.types';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max:              5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    });

    pool.on('error', (err) => logger.error('PG pool error', { error: err.message }));
  }
  return pool;
}

// ─── Job Status ───────────────────────────────────────────────

export async function updateJobStatus(
  jobId:    string,
  status:   'processing' | 'completed' | 'failed' | 'retrying',
  progress: number,
  opts: {
    errorMessage?: string;
    workerId?:     string;
    retryCount?:   number;
  } = {},
): Promise<void> {
  const db = getPool();
  try {
    await db.query(
      `UPDATE transcoding_jobs
       SET status         = $1,
           progress       = $2,
           error_message  = $3,
           worker_id      = COALESCE($4, worker_id),
           retry_count    = COALESCE($5, retry_count),
           started_at     = CASE WHEN $1 = 'processing' AND started_at IS NULL THEN NOW() ELSE started_at END,
           completed_at   = CASE WHEN $1 IN ('completed','failed') THEN NOW() ELSE NULL END,
           updated_at     = NOW()
       WHERE id = $6`,
      [
        status,
        progress,
        opts.errorMessage || null,
        opts.workerId     || null,
        opts.retryCount   || null,
        jobId,
      ],
    );
  } catch (err) {
    logger.error(`Failed to update job status: ${err.message}`, { jobId });
  }
}

// ─── Video Asset ──────────────────────────────────────────────

export async function updateVideoAsset(
  videoAssetId: string,
  data: {
    masterUrl?:      string;
    durationSeconds?: number;
    fileSizeBytes?:  number;
  },
): Promise<void> {
  const db     = getPool();
  const fields: string[] = [];
  const values: any[]    = [];
  let   idx              = 1;

  if (data.masterUrl      !== undefined) { fields.push(`master_url = $${idx++}`);       values.push(data.masterUrl); }
  if (data.durationSeconds !== undefined){ fields.push(`duration_seconds = $${idx++}`); values.push(data.durationSeconds); }
  if (data.fileSizeBytes   !== undefined){ fields.push(`file_size_bytes = $${idx++}`);  values.push(data.fileSizeBytes); }

  if (!fields.length) return;

  values.push(videoAssetId);
  await db.query(
    `UPDATE video_assets SET ${fields.join(', ')} WHERE id = $${idx}`,
    values,
  );
}

// ─── Renditions ───────────────────────────────────────────────

export async function insertRenditions(
  videoAssetId: string,
  renditions:   RenditionResult[],
): Promise<void> {
  const db = getPool();
  for (const r of renditions) {
    await db.query(
      `INSERT INTO video_renditions
         (video_asset_id, resolution, bitrate_kbps, playlist_url, file_size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [videoAssetId, r.resolution, r.bitrateKbps, r.playlistUrl, r.fileSizeBytes],
    );
  }
}

// ─── Subtitles ────────────────────────────────────────────────

export async function insertSubtitles(
  videoAssetId: string,
  subtitles:    SubtitleResult[],
): Promise<void> {
  const db = getPool();
  for (const s of subtitles) {
    await db.query(
      `INSERT INTO subtitles
         (video_asset_id, language_code, language_name, vtt_url, format, is_default)
       VALUES ($1, $2, $3, $4, 'vtt', $5)
       ON CONFLICT DO NOTHING`,
      [videoAssetId, s.languageCode, s.languageName, s.vttUrl, s.isDefault],
    );
  }
}

// ─── Audio Tracks ─────────────────────────────────────────────

export async function insertAudioTracks(
  videoAssetId: string,
  tracks:       AudioTrackResult[],
): Promise<void> {
  const db = getPool();
  for (const t of tracks) {
    await db.query(
      `INSERT INTO audio_tracks
         (video_asset_id, language_code, language_name, is_default, codec)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [videoAssetId, t.languageCode, t.languageName, t.isDefault, t.codec],
    );
  }
}

// ─── Thumbnail Sprite ─────────────────────────────────────────

export async function insertSprite(
  videoAssetId: string,
  sprite:       SpriteResult,
): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO thumbnail_sprites
       (video_asset_id, sprite_url, vtt_url, tile_width, tile_height, interval_sec, columns, rows)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [
      videoAssetId,
      sprite.spriteUrl,
      sprite.vttUrl,
      sprite.tileWidth,
      sprite.tileHeight,
      sprite.intervalSec,
      sprite.columns,
      sprite.rows,
    ],
  );
}

// ─── Content status update (after transcode) ──────────────────

export async function publishContent(
  contentId?: string,
  episodeId?: string,
): Promise<void> {
  const db = getPool();
  if (contentId) {
    await db.query(
      `UPDATE content
       SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
       WHERE id = $1 AND status = 'processing'`,
      [contentId],
    );
  }
  if (episodeId) {
    await db.query(
      `UPDATE episodes
       SET status = 'published', published_at = COALESCE(published_at, NOW())
       WHERE id = $1 AND status = 'processing'`,
      [episodeId],
    );
  }
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
}
