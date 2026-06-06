import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class SignedUrlService {
  private readonly logger = new Logger(SignedUrlService.name);
  private readonly secret:  string;
  private readonly ttl:     number;   // seconds
  private readonly r2Endpoint: string;
  private readonly r2Bucket:   string;

  constructor(private configService: ConfigService) {
    this.secret      = this.configService.get<string>('app.cloudflare.signedUrlSecret');
    this.ttl         = this.configService.get<number>('app.cloudflare.signedUrlTtl', 3600);
    this.r2Endpoint  = this.configService.get<string>('app.cloudflare.r2Endpoint');
    this.r2Bucket    = this.configService.get<string>('app.cloudflare.r2Bucket', 'ott-media');
  }

  /**
   * Generate a signed token for an R2 path.
   * Token = HMAC-SHA256( path + ":" + expires, secret )
   */
  generateToken(r2Path: string): { token: string; expires: number } {
    const expires = Math.floor(Date.now() / 1000) + this.ttl;
    const message = `${r2Path}:${expires}`;
    const token   = createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');

    return { token, expires };
  }

  /**
   * Verify a signed token.
   */
  verifyToken(r2Path: string, token: string, expires: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) return false;

    const message  = `${r2Path}:${expires}`;
    const expected = createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');

    // Constant-time comparison
    if (expected.length !== token.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
    }
    return mismatch === 0;
  }

  /**
   * Build a full signed CDN URL for an R2 path.
   * CDN URL uses Cloudflare's domain (not direct R2 endpoint).
   */
  buildSignedUrl(r2Path: string, cdnBase?: string): string {
    const { token, expires } = this.generateToken(r2Path);
    const base = cdnBase || `https://${this.r2Bucket}.r2.dev`;
    return `${base}/${r2Path}?token=${token}&expires=${expires}`;
  }

  /**
   * Rewrite a master.m3u8 content to inject signed tokens into
   * all variant playlist URLs and segment URLs.
   */
  rewriteM3u8WithTokens(
    m3u8Content: string,
    baseR2Path: string,
    cdnBase: string,
  ): string {
    const lines = m3u8Content.split('\n');
    const { token, expires } = this.generateToken(baseR2Path);

    return lines
      .map((line) => {
        const trimmed = line.trim();

        // Skip empty lines and comments (except URI= references)
        if (!trimmed || trimmed.startsWith('#EXT')) {
          // Rewrite URI= in EXT-X-MEDIA and EXT-X-STREAM-INF tags
          return line.replace(
            /URI="([^"]+)"/g,
            (_, uri) => {
              const fullPath = this.resolveR2Path(uri, baseR2Path);
              return `URI="${cdnBase}/${fullPath}?token=${token}&expires=${expires}"`;
            },
          );
        }

        // Variant playlist line (.m3u8) or segment line (.ts, .vtt)
        if (
          trimmed.endsWith('.m3u8') ||
          trimmed.endsWith('.ts') ||
          trimmed.endsWith('.vtt')
        ) {
          const fullPath = this.resolveR2Path(trimmed, baseR2Path);
          return `${cdnBase}/${fullPath}?token=${token}&expires=${expires}`;
        }

        return line;
      })
      .join('\n');
  }

  private resolveR2Path(uri: string, basePath: string): string {
    // If already absolute, strip CDN prefix and return relative
    if (uri.startsWith('http')) {
      const url = new URL(uri);
      return url.pathname.replace(/^\//, '');
    }
    // Relative path — combine with base directory
    const baseDir = basePath.split('/').slice(0, -1).join('/');
    return `${baseDir}/${uri}`.replace(/\/\//g, '/');
  }
}
