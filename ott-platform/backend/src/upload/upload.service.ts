import {
  Injectable, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }        from 'typeorm';
import { ConfigService }     from '@nestjs/config';
import { R2ApiService }      from './r2.service';
import { TranscodingService } from '../transcoding/transcoding.service';
import { VideoAssetEntity }   from '../content/entities/video-asset.entity';
import { ContentEntity, ContentType, ContentStatus } from '../content/entities/content.entity';
import { EpisodeEntity }      from '../content/entities/episode.entity';

const ALLOWED_EXTENSIONS = new Set(['mp4','mkv','mov','avi','webm','mpg','mpeg']);
const ALLOWED_MIME_TYPES  = new Set([
  'video/mp4','video/x-matroska','video/quicktime',
  'video/x-msvideo','video/webm','video/mpeg',
  'application/octet-stream','video/x-m4v',
]);

export interface InitiateUploadDto {
  contentId?: string; episodeId?: string;
  filename: string; fileSize: number; mimeType: string; partCount: number;
}
export interface CompleteUploadDto {
  uploadId: string; key: string; videoAssetId: string;
  parts: { PartNumber: number; ETag: string }[];
  autoTranscode?: boolean;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

  constructor(
    @InjectRepository(VideoAssetEntity) private videoAssetRepo: Repository<VideoAssetEntity>,
    @InjectRepository(ContentEntity)    private contentRepo:    Repository<ContentEntity>,
    @InjectRepository(EpisodeEntity)    private episodeRepo:    Repository<EpisodeEntity>,
    private r2Service:          R2ApiService,
    private transcodingService: TranscodingService,
    private configService:      ConfigService,
  ) {}

  async initiateUpload(dto: InitiateUploadDto, uploadedBy: string) {
    const ext = dto.filename.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext))  throw new BadRequestException(`File type .${ext} not supported`);
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) throw new BadRequestException(`MIME type not allowed`);
    if (dto.fileSize > this.MAX_FILE_SIZE) throw new BadRequestException('File size exceeds 5 GB');
    if (dto.partCount < 1 || dto.partCount > 1000) throw new BadRequestException('partCount must be 1-1000');

    let contentId = dto.contentId;
    let episodeId = dto.episodeId;
    let contentType: 'movies' | 'series' = 'movies';

    if (episodeId) {
      const ep = await this.episodeRepo.findOne({ where: { id: episodeId } });
      if (!ep) throw new NotFoundException('Episode not found');
      contentId   = ep.contentId;
      contentType = 'series';
    } else if (contentId) {
      const c = await this.contentRepo.findOne({ where: { id: contentId } });
      if (!c) throw new NotFoundException('Content not found');
      contentType = c.type === ContentType.SERIES ? 'series' : 'movies';
    } else {
      throw new BadRequestException('contentId or episodeId required');
    }

    const r2Key = this.r2Service.buildRawUploadKey(contentType, contentId, dto.filename, episodeId);
    const { uploadId, key } = await this.r2Service.createMultipartUpload(r2Key, dto.mimeType);

    const partUrls = await Promise.all(
      Array.from({ length: dto.partCount }, (_, i) =>
        this.r2Service.presignPartUrl(key, uploadId, i + 1, 7200),
      ),
    );

    const asset = this.videoAssetRepo.create({
      contentId: contentId || null,
      episodeId: episodeId || null,
      r2BasePath: this.r2Service.buildOutputBasePath(contentType, contentId, episodeId),
      originalFilename: dto.filename,
      fileSizeBytes:    dto.fileSize,
    });
    const savedAsset = await this.videoAssetRepo.save(asset);

    if (contentId) await this.contentRepo.update(contentId, { status: ContentStatus.PROCESSING });
    if (episodeId) await this.episodeRepo.update(episodeId, { status: ContentStatus.PROCESSING });

    this.logger.log(`Upload initiated: ${key} (${dto.partCount} parts)`);
    return { uploadId, key, videoAssetId: savedAsset.id, partUrls, cdnBase: this.r2Service.cdnBase };
  }

  async completeUpload(dto: CompleteUploadDto) {
    const asset = await this.videoAssetRepo.findOne({ where: { id: dto.videoAssetId } });
    if (!asset) throw new NotFoundException('Video asset not found');

    const url = await this.r2Service.completeMultipartUpload(dto.key, dto.uploadId, dto.parts);
    this.logger.log(`Upload complete: ${dto.key}`);

    if (dto.autoTranscode !== false) {
      const contentType = asset.episodeId ? 'series' : 'movies';
      const jobResult   = await this.transcodingService.enqueueTranscode({
        videoAssetId: dto.videoAssetId,
        contentId:    asset.contentId,
        episodeId:    asset.episodeId,
        inputR2Key:   dto.key,
        contentType,
        targetRenditions: ['1080p','720p','480p','360p'],
        priority: 5, extractSubtitles: true, extractAudio: true, generateSprite: true,
      });
      return { url, ...jobResult };
    }
    return { url };
  }

  async abortUpload(key: string, uploadId: string): Promise<void> {
    await this.r2Service.abortMultipartUpload(key, uploadId);
    this.logger.warn(`Upload aborted: ${key}`);
  }

  async getPresignedPutUrl(contentId: string, filename: string, mimeType: string) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) throw new BadRequestException(`File type .${ext} not supported`);
    const content = await this.contentRepo.findOne({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');
    const contentType: 'movies' | 'series' = content.type === ContentType.SERIES ? 'series' : 'movies';
    const key = this.r2Service.buildRawUploadKey(contentType, contentId, filename);
    const url = await this.r2Service.presignPutUrl(key, mimeType);
    return { url, key };
  }
}
