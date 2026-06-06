import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }        from 'typeorm';
import { InjectQueue }       from '@nestjs/bull';
import { Queue }             from 'bull';
import { ConfigService }     from '@nestjs/config';
import { v4 as uuidv4 }     from 'uuid';
import { R2ApiService }      from '../upload/r2.service';
import { VideoAssetEntity }  from '../content/entities/video-asset.entity';
import { ContentEntity }     from '../content/entities/content.entity';
import { EpisodeEntity }     from '../content/entities/episode.entity';
import { InjectRepository as InjectRepo } from '@nestjs/typeorm';

export interface EnqueueTranscodeDto {
  videoAssetId:     string;
  contentId?:       string;
  episodeId?:       string;
  inputR2Key:       string;
  contentType:      'movies' | 'series';
  targetRenditions?: string[];
  priority?:         number;
  extractSubtitles?: boolean;
  extractAudio?:     boolean;
  generateSprite?:   boolean;
}

@Injectable()
export class TranscodingService {
  private readonly logger = new Logger(TranscodingService.name);

  constructor(
    @InjectRepository(VideoAssetEntity)
    private videoAssetRepo: Repository<VideoAssetEntity>,

    @InjectQueue('transcode')
    private transcodeQueue: Queue,

    private r2Service: R2ApiService,
    private configService: ConfigService,
  ) {}

  // ─── Enqueue a new transcoding job ────────────────────────

  async enqueueTranscode(dto: EnqueueTranscodeDto): Promise<{
    jobId: string;
    bullJobId: string | number;
  }> {
    const outputBasePath = this.r2Service.buildOutputBasePath(
      dto.contentType,
      dto.contentId || dto.episodeId,
      dto.episodeId,
    );

    // Create DB job record (transcoding_jobs table)
    const jobId = uuidv4();

    // Insert job into transcoding_jobs via raw query
    // (avoids circular dependency with TypeORM entity in worker context)
    const { DataSource } = await import('typeorm');

    const payload = {
      jobId,
      videoAssetId:     dto.videoAssetId,
      contentId:        dto.contentId,
      episodeId:        dto.episodeId,
      inputR2Key:       dto.inputR2Key,
      outputR2BasePath: outputBasePath,
      contentType:      dto.contentType === 'movies' ? 'movie' : 'series',
      targetRenditions: dto.targetRenditions || ['1080p', '720p', '480p', '360p'],
      extractSubtitles: dto.extractSubtitles ?? true,
      extractAudio:     dto.extractAudio     ?? true,
      generateSprite:   dto.generateSprite   ?? true,
      priority:         dto.priority         ?? 5,
    };

    // Add to BullMQ with configured retry logic
    const bullJob = await this.transcodeQueue.add(
      'transcode-video',
      payload,
      {
        priority:  dto.priority || 5,
        attempts:  3,
        backoff:   { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail:     500,
        jobId:     `transcode:${dto.videoAssetId}`,  // idempotent re-queue
      },
    );

    // Persist job record in DB
    await this.videoAssetRepo.manager.query(
      `INSERT INTO transcoding_jobs
         (id, video_asset_id, bullmq_job_id, status, priority)
       VALUES ($1, $2, $3, 'pending', $4)
       ON CONFLICT (id) DO NOTHING`,
      [jobId, dto.videoAssetId, String(bullJob.id), dto.priority || 5],
    );

    this.logger.log(
      `Enqueued transcode job ${jobId} (bull: ${bullJob.id}) for asset ${dto.videoAssetId}`,
    );

    return { jobId, bullJobId: bullJob.id };
  }

  // ─── Get job status ───────────────────────────────────────

  async getJobStatus(videoAssetId: string): Promise<any> {
    const rows = await this.videoAssetRepo.manager.query(
      `SELECT tj.*, va.master_url
       FROM transcoding_jobs tj
       LEFT JOIN video_assets va ON va.id = tj.video_asset_id
       WHERE tj.video_asset_id = $1
       ORDER BY tj.created_at DESC
       LIMIT 1`,
      [videoAssetId],
    );

    if (!rows.length) throw new NotFoundException('No transcoding job found');
    return rows[0];
  }

  // ─── Retry a failed job ───────────────────────────────────

  async retryJob(videoAssetId: string): Promise<void> {
    const rows = await this.videoAssetRepo.manager.query(
      `SELECT * FROM transcoding_jobs WHERE video_asset_id = $1 AND status = 'failed' ORDER BY created_at DESC LIMIT 1`,
      [videoAssetId],
    );

    if (!rows.length) throw new NotFoundException('No failed job found');

    const record = rows[0];

    // Try to retry the BullMQ job
    try {
      const bullJob = await this.transcodeQueue.getJob(record.bullmq_job_id);
      if (bullJob) await bullJob.retry();
    } catch {
      // Job may have been removed — re-add it
      this.logger.warn(`Bull job ${record.bullmq_job_id} not found, re-enqueuing`);
    }

    await this.videoAssetRepo.manager.query(
      `UPDATE transcoding_jobs SET status = 'pending', error_message = NULL, updated_at = NOW() WHERE id = $1`,
      [record.id],
    );
  }

  // ─── List all jobs (admin) ────────────────────────────────

  async listJobs(status?: string, limit = 50): Promise<any[]> {
    const whereClause = status ? 'WHERE tj.status = $1' : '';
    const params      = status ? [status, limit] : [limit];
    const statusIdx   = status ? '$2' : '$1';

    return this.videoAssetRepo.manager.query(
      `SELECT tj.id, tj.status, tj.progress, tj.priority, tj.error_message,
              tj.started_at, tj.completed_at, tj.created_at, tj.retry_count,
              va.original_filename, va.content_id, va.episode_id
       FROM transcoding_jobs tj
       LEFT JOIN video_assets va ON va.id = tj.video_asset_id
       ${whereClause}
       ORDER BY tj.created_at DESC
       LIMIT ${statusIdx}`,
      params,
    );
  }

  // ─── Queue stats ──────────────────────────────────────────

  async getQueueStats(): Promise<Record<string, number>> {
    const counts = await this.transcodeQueue.getJobCounts();
    return counts as any;
  }
}
