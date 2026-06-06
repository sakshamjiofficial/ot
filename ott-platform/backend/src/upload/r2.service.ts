import { Injectable, Logger } from '@nestjs/common';
import { ConfigService }       from '@nestjs/config';
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2ApiService {
  private readonly logger = new Logger(R2ApiService.name);
  private readonly s3:     S3Client;
  private readonly bucket: string;
  readonly cdnBase:        string;

  constructor(private configService: ConfigService) {
    this.bucket  = this.configService.get('app.cloudflare.r2Bucket', 'ott-media');
    this.cdnBase = this.configService.get('CF_R2_PUBLIC_URL')
      || `https://${this.bucket}.r2.dev`;

    this.s3 = new S3Client({
      region:   'auto',
      endpoint: this.configService.get('app.cloudflare.r2Endpoint'),
      credentials: {
        accessKeyId:     this.configService.get('app.cloudflare.r2AccessKey'),
        secretAccessKey: this.configService.get('app.cloudflare.r2SecretKey'),
      },
      forcePathStyle: true,
    });
  }

  async createMultipartUpload(key: string, contentType: string): Promise<{ uploadId: string; key: string }> {
    const cmd    = new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const result = await this.s3.send(cmd);
    return { uploadId: result.UploadId, key };
  }

  async presignPartUrl(key: string, uploadId: string, partNumber: number, expiresIn = 3600): Promise<string> {
    const cmd = new UploadPartCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, PartNumber: partNumber });
    return getSignedUrl(this.s3, cmd, { expiresIn });
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]): Promise<string> {
    await this.s3.send(new CompleteMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
    return `${this.cdnBase}/${key}`;
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await this.s3.send(new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }));
  }

  async presignPutUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.s3, cmd, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  buildRawUploadKey(contentType: 'movies' | 'series', contentId: string, filename: string, episodeId?: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
    if (episodeId) return `${contentType}/${contentId}/raw/${episodeId}/input.${ext}`;
    return `${contentType}/${contentId}/raw/input.${ext}`;
  }

  buildOutputBasePath(contentType: 'movies' | 'series', contentId: string, episodeId?: string): string {
    if (episodeId) return `${contentType}/${contentId}/episodes/${episodeId}/`;
    return `${contentType}/${contentId}/`;
  }
}
