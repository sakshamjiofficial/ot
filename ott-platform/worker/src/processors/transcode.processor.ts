import * as path     from 'path';
import * as fs       from 'fs-extra';
import { Job }       from 'bullmq';
import { R2Service } from '../services/r2.service';
import {
  probeVideo,
  selectRenditions,
  transcodeRendition,
  extractAudioTracks,
  extractSubtitles,
  buildMasterPlaylist,
} from '../services/ffmpeg.service';
import {
  generateThumbnails,
  generateSpriteSheet,
  generateBlurPlaceholder,
} from '../services/thumbnail.service';
import {
  updateJobStatus,
  updateVideoAsset,
  insertRenditions,
  insertSubtitles,
  insertAudioTracks,
  insertSprite,
  publishContent,
} from '../services/db.service';
import {
  createJobWorkDir,
  cleanupJobDir,
  inputPath,
  outputDir,
  subtitlesDir,
  thumbnailsDir,
} from '../utils/file-utils';
import { waitForResources }  from '../utils/cpu-guard';
import { jobLogger }         from '../utils/logger';
import {
  TranscodeJobPayload,
  TranscodeJobResult,
  RenditionResult,
  SubtitleResult,
  AudioTrackResult,
} from '../types/job.types';

const WORKER_ID = `worker-${process.pid}`;

export async function processTranscodeJob(
  job: Job<TranscodeJobPayload>,
): Promise<TranscodeJobResult> {
  const payload = job.data;
  const log     = jobLogger(payload.jobId);
  const r2      = new R2Service();
  const cdnBase = process.env.CF_R2_PUBLIC_URL || `https://${process.env.CF_R2_BUCKET}.r2.dev`;

  log.info(`Starting transcode job`, {
    contentId: payload.contentId,
    episodeId: payload.episodeId,
    input:     payload.inputR2Key,
    renditions: payload.targetRenditions,
  });

  // ─── Mark job as processing ───────────────────────────────
  await updateJobStatus(payload.jobId, 'processing', 0, { workerId: WORKER_ID });

  // ─── Create isolated work directory ──────────────────────
  const workDir = await createJobWorkDir(payload.jobId);
  const rawInput = inputPath(payload.jobId, 'input_raw');

  try {
    // ═════════════════════════════════════════════════════════
    // STAGE 1: Download raw video from R2
    // ═════════════════════════════════════════════════════════
    log.info('Stage 1/7: Downloading source video from R2');
    await updateJobStatus(payload.jobId, 'processing', 5);

    await r2.download(payload.inputR2Key, rawInput);

    // ═════════════════════════════════════════════════════════
    // STAGE 2: Probe
    // ═════════════════════════════════════════════════════════
    log.info('Stage 2/7: Probing source video');
    await updateJobStatus(payload.jobId, 'processing', 10);

    const probe = await probeVideo(rawInput);
    log.info(`Probe result: ${probe.width}x${probe.height} @ ${probe.fps}fps, ${probe.durationSecs.toFixed(1)}s, ${probe.audioStreams.length} audio, ${probe.subtitleStreams.length} subtitles`);

    // Update asset with duration and size
    await updateVideoAsset(payload.videoAssetId, {
      durationSeconds: Math.round(probe.durationSecs),
      fileSizeBytes:   probe.fileSizeBytes,
    });

    // ═════════════════════════════════════════════════════════
    // STAGE 3: Transcode all renditions
    // ═════════════════════════════════════════════════════════
    log.info('Stage 3/7: Transcoding renditions');

    // Wait for CPU/RAM headroom before starting FFmpeg
    await waitForResources(payload.jobId);

    const profiles     = selectRenditions(probe.height, payload.targetRenditions);
    const renditionResults: RenditionResult[] = [];
    const totalProfiles = profiles.length;

    for (let i = 0; i < profiles.length; i++) {
      const profile   = profiles[i];
      const baseProgress = 10 + Math.round((i / totalProfiles) * 50);

      log.info(`Transcoding ${i + 1}/${totalProfiles}: ${profile.name}`);

      // Update job progress per rendition step
      await job.updateProgress(baseProgress);
      await updateJobStatus(payload.jobId, 'processing', baseProgress);

      const result = await transcodeRendition(
        rawInput,
        payload.jobId,
        profile,
        probe.fps,
        (pct) => {
          const overall = baseProgress + Math.round((pct / 100) * (50 / totalProfiles));
          job.updateProgress(Math.min(overall, 59)).catch(() => {});
        },
      );

      renditionResults.push(result);
    }

    // ═════════════════════════════════════════════════════════
    // STAGE 4: Extract audio tracks (multi-language)
    // ═════════════════════════════════════════════════════════
    log.info('Stage 4/7: Extracting audio tracks');
    await updateJobStatus(payload.jobId, 'processing', 62);

    let audioTracks: AudioTrackResult[] = [];
    if (payload.extractAudio) {
      audioTracks = await extractAudioTracks(rawInput, payload.jobId, probe);
    }

    // ═════════════════════════════════════════════════════════
    // STAGE 5: Extract subtitles
    // ═════════════════════════════════════════════════════════
    log.info('Stage 5/7: Extracting subtitles');
    await updateJobStatus(payload.jobId, 'processing', 65);

    let subtitleResults: SubtitleResult[] = [];
    if (payload.extractSubtitles && probe.subtitleStreams.length > 0) {
      subtitleResults = await extractSubtitles(rawInput, payload.jobId, probe);
    }

    // ═════════════════════════════════════════════════════════
    // STAGE 6: Generate thumbnails + sprite
    // ═════════════════════════════════════════════════════════
    log.info('Stage 6/7: Generating thumbnails and sprite');
    await updateJobStatus(payload.jobId, 'processing', 68);

    const thumbs = await generateThumbnails(rawInput, payload.jobId, probe.durationSecs);

    let spriteLocal = null;
    if (payload.generateSprite) {
      spriteLocal = await generateSpriteSheet(rawInput, payload.jobId, probe.durationSecs);
    }

    // ═════════════════════════════════════════════════════════
    // STAGE 7: Upload everything to R2
    // ═════════════════════════════════════════════════════════
    log.info('Stage 7/7: Uploading to R2');
    await updateJobStatus(payload.jobId, 'processing', 72);

    const base = payload.outputR2BasePath.replace(/\/$/, '');

    // ── Upload HLS rendition directories ───────────────────
    const uploadedRenditions: RenditionResult[] = [];

    for (const r of renditionResults) {
      const localDir = path.join(outputDir(payload.jobId), r.resolution);
      const r2Prefix = `${base}/${r.resolution}`;

      const uploaded = await r2.uploadDirectory(localDir, r2Prefix, 4);

      // Find the playlist URL in uploaded files
      const playlistEntry = uploaded.find((u) => u.key.endsWith('index.m3u8'));

      uploadedRenditions.push({
        ...r,
        playlistUrl: playlistEntry
          ? `${cdnBase}/${playlistEntry.key}`
          : `${cdnBase}/${r2Prefix}/index.m3u8`,
      });

      log.info(`Uploaded ${r.resolution}: ${uploaded.length} files`);
    }

    // ── Upload multi-audio track HLS (if multi-language) ───
    if (audioTracks.length > 1) {
      const audioOutDir = path.join(outputDir(payload.jobId), 'audio');
      if (await fs.pathExists(audioOutDir)) {
        await r2.uploadDirectory(audioOutDir, `${base}/audio`, 4);
      }
    }

    // ── Upload subtitles ────────────────────────────────────
    const uploadedSubtitles: SubtitleResult[] = [];
    for (const sub of subtitleResults) {
      const r2Key = `${base}/subtitles/${sub.languageCode}.vtt`;
      const url   = await r2.upload(sub.vttUrl, r2Key, 'text/vtt', 'public, max-age=86400');
      uploadedSubtitles.push({ ...sub, vttUrl: url });
    }

    // ── Upload thumbnails ───────────────────────────────────
    const [posterUrl, bannerUrl, thumbUrl] = await Promise.all([
      r2.upload(thumbs.poster, `${base}/thumbnails/poster.webp`,  'image/webp', 'public, max-age=86400'),
      r2.upload(thumbs.banner, `${base}/thumbnails/banner.webp`,  'image/webp', 'public, max-age=86400'),
      r2.upload(thumbs.thumb,  `${base}/thumbnails/thumb.webp`,  'image/webp', 'public, max-age=86400'),
    ]);

    // ── Upload sprite + VTT ─────────────────────────────────
    let uploadedSprite = null;
    if (spriteLocal) {
      const [spriteUrl, spriteVttLocalContent] = await Promise.all([
        r2.upload(spriteLocal.spriteUrl, `${base}/thumbnails/sprite.jpg`, 'image/jpeg', 'public, max-age=86400'),
        fs.readFile(spriteLocal.vttUrl, 'utf-8'),
      ]);

      // Patch the placeholder URL in sprite VTT with real R2 URL
      const patchedVtt    = spriteVttLocalContent.replace(
        /__SPRITE_URL__/g,
        spriteUrl,
      );
      const patchedVttBuf = Buffer.from(patchedVtt);
      const spriteVttUrl  = await r2.uploadBuffer(
        patchedVttBuf,
        `${base}/thumbnails/sprite.vtt`,
        'text/vtt',
        'public, max-age=86400',
      );

      uploadedSprite = {
        ...spriteLocal,
        spriteUrl,
        vttUrl: spriteVttUrl,
      };
    }

    // ── Build and upload master.m3u8 ───────────────────────
    log.info('Building and uploading master.m3u8');

    const masterContent = buildMasterPlaylist(
      uploadedRenditions,
      `${base}/`,
      audioTracks.length > 1 ? audioTracks : [],
      uploadedSubtitles,
    );

    const masterBuf = Buffer.from(masterContent);
    const masterUrl = await r2.uploadBuffer(
      masterBuf,
      `${base}/master.m3u8`,
      'application/vnd.apple.mpegurl',
      'public, max-age=300',
    );

    // ═════════════════════════════════════════════════════════
    // PERSIST RESULTS TO DATABASE
    // ═════════════════════════════════════════════════════════
    await updateJobStatus(payload.jobId, 'processing', 95);

    await Promise.all([
      updateVideoAsset(payload.videoAssetId, { masterUrl }),
      insertRenditions(payload.videoAssetId, uploadedRenditions),
      insertSubtitles(payload.videoAssetId,  uploadedSubtitles),
      insertAudioTracks(payload.videoAssetId, audioTracks),
    ]);

    if (uploadedSprite) {
      await insertSprite(payload.videoAssetId, uploadedSprite);
    }

    // Update content/episode thumbnail URLs in DB
    if (payload.contentId) {
      const { getPool } = await import('../services/db.service');
      await getPool().query(
        `UPDATE content
         SET poster_url    = COALESCE(poster_url, $1),
             banner_url    = COALESCE(banner_url, $2),
             thumbnail_url = COALESCE(thumbnail_url, $3),
             updated_at    = NOW()
         WHERE id = $4`,
        [posterUrl, bannerUrl, thumbUrl, payload.contentId],
      );
    }

    if (payload.episodeId) {
      const { getPool } = await import('../services/db.service');
      await getPool().query(
        `UPDATE episodes SET thumbnail_url = COALESCE(thumbnail_url, $1) WHERE id = $2`,
        [thumbUrl, payload.episodeId],
      );
    }

    // Auto-publish if content was in 'processing' status
    await publishContent(payload.contentId, payload.episodeId);

    // Mark job done
    await updateJobStatus(payload.jobId, 'completed', 100);
    await job.updateProgress(100);

    log.info('Transcode job completed successfully', {
      masterUrl,
      renditions: uploadedRenditions.length,
      subtitles:  uploadedSubtitles.length,
      audioTracks: audioTracks.length,
    });

    return {
      videoAssetId:  payload.videoAssetId,
      masterUrl,
      renditions:    uploadedRenditions,
      subtitles:     uploadedSubtitles,
      audioTracks,
      sprite:        uploadedSprite,
      durationSecs:  Math.round(probe.durationSecs),
      fileSizeBytes: probe.fileSizeBytes,
    };

  } catch (err) {
    log.error(`Transcode job failed: ${err.message}`, { stack: err.stack });

    await updateJobStatus(payload.jobId, 'failed', 0, {
      errorMessage: err.message,
      workerId:     WORKER_ID,
    });

    throw err;   // Re-throw so BullMQ handles retry logic

  } finally {
    // Always clean up temp files
    await cleanupJobDir(payload.jobId);
    log.info('Work directory cleaned up');
  }
}
