import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';
import { createHash } from 'crypto';

@Injectable()
export class DeviceFingerprintMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.get('user-agent') || '';
    const ip        = this.extractIp(req);
    const deviceId  = req.get('X-Device-Id') || '';
    const appVersion = req.get('X-App-Version') || '';

    const parser = new UAParser(userAgent);
    const ua     = parser.getResult();

    // Generate deterministic fingerprint from device signals
    const fingerprintSource = [
      deviceId,
      ua.browser.name || '',
      ua.os.name || '',
      ip,
    ].join('|');

    const fingerprint = createHash('sha256')
      .update(fingerprintSource)
      .digest('hex')
      .slice(0, 32);

    // Attach to request for downstream use
    (req as any).deviceInfo = {
      fingerprint,
      deviceId,
      appVersion,
      ip,
      userAgent,
      deviceType: this.detectDeviceType(ua, req),
      deviceName: this.buildDeviceName(ua),
    };

    next();
  }

  private extractIp(req: Request): string {
    // Trust Cloudflare CF-Connecting-IP header
    return (
      (req.get('CF-Connecting-IP') as string) ||
      (req.get('X-Forwarded-For') as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '0.0.0.0'
    );
  }

  private detectDeviceType(ua: UAParser.IResult, req: Request): string {
    const xDeviceType = req.get('X-Device-Type');
    if (xDeviceType) return xDeviceType;

    if (ua.device.type === 'mobile')  return 'android';
    if (ua.device.type === 'tablet')  return 'android';
    if (ua.device.type === 'smarttv') return 'tv';
    return 'web';
  }

  private buildDeviceName(ua: UAParser.IResult): string {
    const parts = [
      ua.device.vendor,
      ua.device.model,
      ua.os.name,
      ua.browser.name,
    ].filter(Boolean);

    return parts.join(' ') || 'Unknown Device';
  }
}
