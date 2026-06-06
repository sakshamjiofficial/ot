import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { VideoAssetEntity } from '../content/entities/video-asset.entity';
import { ContentEntity, ContentStatus } from '../content/entities/content.entity';
import { EpisodeEntity } from '../content/entities/episode.entity';
import { SignedUrlService } from './signed-url.service';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly s3:  S3Client;
  private readonly bucket:   string;
  private readonly cdnBase:  string;

  constructor(
    @InjectRepository(VideoAssetEntity)
    private videoAssetRepo: Repository<VideoAssetEntity>,

    @InjectRepository(ContentEntity)
    private contentRepo: Repository<ContentEntity>,

    private configService: ConfigService,
    private signedUrlService: SignedUrlService,
  ) {
    this.bucket  = this.configService.get<string>('app.cloudflare.r2Bucket', 'ott-media');
    this.cdnBase = `https://${this.bucket}.r2.dev`;

    this.s3 = new S3Client({
      region:      'auto',
      endpoint:    this.configService.get<string>('app.cloudflare.r2Endpoint'),
      credentials: {
        accessKeyId:     this.configService.get<string>('app.cloudflare.r2AccessKey'),
        secretAccessKey: this.configService.get<string>('app.cloudflare.r2SecretKey'),
      },
    });
  }

  /**
   * Get signed master.m3u8 for a content item (movie) or episode.
   * Validates access, fetches the manifest from R2, rewrites URLs with tokens.
   */
  async getSignedMasterPlaylist(
    contentId: string,
    episodeId: string | undefined,
    userId: string,
    hasSubscription: boolean,
  ): Promise<{ playlist: string; contentType: string }> {

    // ─── Resolve video asset ────────────────────────────────
    let asset: VideoAssetEntity;

    if (episodeId) {
      asset = await this.videoAssetRepo.findOne({
        where: { episodeId },
        relations: ['episode'],
      });
      if (!asset) throw new NotFoundException('Video not found for this episode');

      // Check premium gating
      if ((asset.episode as any)?.isPremium && !hasSubscription) {
        throw new ForbiddenException('Premium subscription required');
      }
    } else {
      asset = await this.videoAssetRepo.findOne({
        where: { contentId },
        relations: ['content'],
      });
      if (!asset) throw new NotFoundException('Video not found');

      const content = asset.content as ContentEntity;
      if (content.status !== ContentStatus.PUBLISHED) {
        throw new NotFoundException('Content not available');
      }
      if (content.isPremium && !hasSubscription) {
        throw new ForbiddenException('Premium subscription required');
      }
    }

    if (!asset.masterUrl) {
      throw new NotFoundException('Video is still processing');
    }

    // ─── Fetch master.m3u8 from R2 ─────────────────────────
    const r2Key = `${asset.r2BasePath}master.m3u8`;

    let m3u8Content: string;
    try {
      const cmd      = new GetObjectCommand({ Bucket: this.bucket, Key: r2Key });
      const response = await this.s3.send(cmd);
      m3u8Content    = await response.Body.transformToString('utf-8');
    } catch (err) {
      this.logger.error(`Failed to fetch master.m3u8 from R2: ${r2Key}`, err);
      throw new NotFoundException('Stream manifest not available');
    }

    // ─── Rewrite URLs with signed tokens ───────────────────
    const signed = this.signedUrlService.rewriteM3u8WithTokens(
      m3u8Content,
      asset.r2BasePath,
      this.cdnBase,
    );

    return { playlist: signed, contentType: 'application/vnd.apple.mpegurl' };
  }

  /**
   * Validate a signed token for any R2 path.
   * Used by Nginx sub-request or Cloudflare Worker to protect segments.
   */
  validateStreamToken(r2Path: string, token: string, expires: string): boolean {
    const expiresNum = parseInt(expires, 10);
    if (isNaN(expiresNum)) return false;
    return this.signedUrlService.verifyToken(r2Path, token, expiresNum);
  }

  /**
   * Get all available stream info (renditions, subtitles, audio tracks).
   */
  async getStreamInfo(contentId: string, episodeId?: string) {
    const asset = await this.videoAssetRepo.findOne({
      where: episodeId ? { episodeId } : { contentId },
      relations: ['renditions', 'subtitles', 'audioTracks'],
    });
    if (!asset) throw new NotFoundException('Stream info not found');

    return {
      assetId:       asset.id,
      duration:      asset.durationSeconds,
      renditions:    asset.renditions.map((r) => ({
        resolution:  r.resolution,
        bitrateKbps: r.bitrateKbps,
      })),
      subtitles: asset.subtitles.map((s) => ({
        languageCode: s.languageCode,
        languageName: s.languageName,
        url: this.signedUrlService.buildSignedUrl(
          `${asset.r2BasePath}subtitles/${s.languageCode}.vtt`,
          this.cdnBase,
        ),
        isDefault: s.isDefault,
      })),
      audioTracks: asset.audioTracks.map((a) => ({
        languageCode: a.languageCode,
        languageName: a.languageName,
        isDefault:    a.isDefault,
      })),
    };
  }
}
