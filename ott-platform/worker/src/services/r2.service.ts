import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload }         from '@aws-sdk/lib-storage';
import { getSignedUrl }   from '@aws-sdk/s3-request-presigner';
import * as fs            from 'fs-extra';
import * as path          from 'path';
import * as stream        from 'stream';
import { promisify }      from 'util';
import { logger }         from '../utils/logger';

const pipeline = promisify(stream.pipeline);

export class R2Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.CF_R2_BUCKET || 'ott-media';
    this.client = new S3Client({
      region:   'auto',
      endpoint: process.env.CF_R2_ENDPOINT,
      credentials: {
        accessKeyId:     process.env.CF_R2_ACCESS_KEY,
        secretAccessKey: process.env.CF_R2_SECRET_KEY,
      },
      forcePathStyle: true,
      // Disable checksum for R2 compatibility
      requestChecksumCalculation: 'WHEN_REQUIRED' as any,
      responseChecksumValidation: 'WHEN_REQUIRED' as any,
    });
  }

  // ─── Download ─────────────────────────────────────────────

  /**
   * Download an R2 object to a local file path.
   * Streams directly to disk — does not buffer in RAM.
   */
  async download(r2Key: string, localPath: string): Promise<void> {
    logger.info(`R2 download: s3://${this.bucket}/${r2Key} → ${localPath}`);

    await fs.ensureDir(path.dirname(localPath));

    const cmd      = new GetObjectCommand({ Bucket: this.bucket, Key: r2Key });
    const response = await this.client.send(cmd);
    const body     = response.Body as NodeJS.ReadableStream;

    const writeStream = fs.createWriteStream(localPath);
    await pipeline(body as any, writeStream);

    const stat = await fs.stat(localPath);
    logger.info(`Downloaded ${r2Key}: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  }

  // ─── Upload (single object) ───────────────────────────────

  async upload(
    localPath: string,
    r2Key:     string,
    contentType: string,
    cacheControl = 'public, max-age=31536000, immutable',
  ): Promise<string> {
    const stat     = await fs.stat(localPath);
    const fileSize = stat.size;

    logger.debug(`R2 upload: ${localPath} → ${r2Key} (${(fileSize / 1024).toFixed(1)} KB)`);

    const fileStream = fs.createReadStream(localPath);

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket:       this.bucket,
        Key:          r2Key,
        Body:         fileStream,
        ContentType:  contentType,
        CacheControl: cacheControl,
      },
      queueSize:    4,            // parallel upload parts
      partSize:     10 * 1024 * 1024,  // 10 MB parts
      leavePartsOnError: false,
    });

    await upload.done();
    return `${process.env.CF_R2_PUBLIC_URL || `https://${this.bucket}.r2.dev`}/${r2Key}`;
  }

  // ─── Upload buffer (small files) ─────────────────────────

  async uploadBuffer(
    buffer:      Buffer,
    r2Key:       string,
    contentType: string,
    cacheControl = 'public, max-age=86400',
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket:       this.bucket,
        Key:          r2Key,
        Body:         buffer,
        ContentType:  contentType,
        CacheControl: cacheControl,
      }),
    );
    return `${process.env.CF_R2_PUBLIC_URL || `https://${this.bucket}.r2.dev`}/${r2Key}`;
  }

  // ─── Upload entire directory recursively ─────────────────

  async uploadDirectory(
    localDir:    string,
    r2Prefix:    string,
    concurrency  = 4,
  ): Promise<{ key: string; url: string }[]> {
    const files   = await this.collectFiles(localDir);
    const results: { key: string; url: string }[] = [];

    // Process in batches to limit concurrency
    const pLimit  = (await import('p-limit')).default;
    const limit   = pLimit(concurrency);

    await Promise.all(
      files.map(({ localPath, relativePath }) =>
        limit(async () => {
          const r2Key      = `${r2Prefix}/${relativePath}`.replace(/\/\//g, '/');
          const contentType = this.mimeType(relativePath);
          const cacheCtrl  = this.cacheControl(relativePath);
          const url        = await this.upload(localPath, r2Key, contentType, cacheCtrl);
          results.push({ key: r2Key, url });
        }),
      ),
    );

    logger.info(`Uploaded ${results.length} files to R2 under ${r2Prefix}`);
    return results;
  }

  // ─── Delete ───────────────────────────────────────────────

  async delete(r2Key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: r2Key }),
    );
  }

  async deletePrefix(prefix: string): Promise<number> {
    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const list = await this.client.send(
        new ListObjectsV2Command({
          Bucket:            this.bucket,
          Prefix:            prefix,
          ContinuationToken: continuationToken,
          MaxKeys:           1000,
        }),
      );

      if (list.Contents?.length) {
        await Promise.all(
          list.Contents.map((obj) => this.delete(obj.Key)),
        );
        deleted += list.Contents.length;
      }

      continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (continuationToken);

    logger.info(`Deleted ${deleted} objects under prefix: ${prefix}`);
    return deleted;
  }

  // ─── Presigned URL ────────────────────────────────────────

  async presignedGetUrl(r2Key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: r2Key });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  // ─── Existence check ──────────────────────────────────────

  async exists(r2Key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: r2Key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async collectFiles(
    dir: string,
    base = dir,
  ): Promise<{ localPath: string; relativePath: string }[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const results: { localPath: string; relativePath: string }[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.collectFiles(fullPath, base)));
      } else {
        results.push({
          localPath:    fullPath,
          relativePath: path.relative(base, fullPath),
        });
      }
    }
    return results;
  }

  private mimeType(filename: string): string {
    if (filename.endsWith('.m3u8'))  return 'application/vnd.apple.mpegurl';
    if (filename.endsWith('.ts'))    return 'video/mp2t';
    if (filename.endsWith('.vtt'))   return 'text/vtt';
    if (filename.endsWith('.webp'))  return 'image/webp';
    if (filename.endsWith('.jpg'))   return 'image/jpeg';
    if (filename.endsWith('.png'))   return 'image/png';
    if (filename.endsWith('.mp4'))   return 'video/mp4';
    if (filename.endsWith('.aac'))   return 'audio/aac';
    if (filename.endsWith('.m4a'))   return 'audio/mp4';
    return 'application/octet-stream';
  }

  private cacheControl(filename: string): string {
    // Segments are immutable — cache forever
    if (filename.endsWith('.ts'))   return 'public, max-age=31536000, immutable';
    // m3u8 playlists: short TTL (variant playlists are static after encode)
    if (filename.endsWith('.m3u8')) return 'public, max-age=300';
    // Thumbnails and images: 1 day
    if (filename.match(/\.(webp|jpg|png)$/)) return 'public, max-age=86400, stale-while-revalidate=3600';
    // VTT subtitles: 1 day
    if (filename.endsWith('.vtt'))  return 'public, max-age=86400';
    return 'public, max-age=86400';
  }
}
