import {
  Injectable, Logger, BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Google Play Server-Side Verification using Google APIs.
 *
 * Uses the androidpublisher REST API v3 to verify subscription purchases.
 * Requires a Google Service Account with Android Publisher API access.
 *
 * Setup:
 *  1. Google Play Console → Setup → API access → Link to Google Cloud project
 *  2. Create service account with "Financial Data Viewer" + "Publisher" roles
 *  3. Download JSON key → set GOOGLE_PLAY_SERVICE_ACCOUNT env var
 */
@Injectable()
export class GooglePlayService {
  private readonly logger = new Logger(GooglePlayService.name);
  private readonly packageName: string;
  private readonly serviceAccountJson: any;

  constructor(private configService: ConfigService) {
    this.packageName        = 'com.ott.app';
    const saJson            = this.configService.get<string>('GOOGLE_PLAY_SERVICE_ACCOUNT');
    this.serviceAccountJson = saJson ? JSON.parse(saJson) : null;
  }

  // ─── Get access token from service account ────────────────

  private async getAccessToken(): Promise<string> {
    if (!this.serviceAccountJson) {
      throw new InternalServerErrorException('Google Play service account not configured');
    }

    const { private_key, client_email } = this.serviceAccountJson;
    const now   = Math.floor(Date.now() / 1000);
    const claim = {
      iss:   client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud:   'https://oauth2.googleapis.com/token',
      exp:   now + 3600,
      iat:   now,
    };

    // Build JWT for service account auth
    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
    const toSign  = `${header}.${payload}`;

    const { createSign } = await import('crypto');
    const sign    = createSign('RSA-SHA256');
    sign.update(toSign);
    const sig    = sign.sign(private_key, 'base64url');
    const jwt    = `${toSign}.${sig}`;

    const res    = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion:  jwt,
      }),
    });

    const data = await res.json() as any;
    if (!data.access_token) {
      throw new InternalServerErrorException('Failed to authenticate with Google Play API');
    }
    return data.access_token;
  }

  // ─── Verify Subscription Purchase ─────────────────────────

  async verifySubscription(
    productId:     string,
    purchaseToken: string,
  ): Promise<{
    isValid:       boolean;
    expiryTimeMs:  number;
    autoRenewing:  boolean;
    paymentState:  number;
    orderId:       string;
    countryCode:   string;
  }> {
    try {
      const token = await this.getAccessToken();
      const url   = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json() as any;
        this.logger.error(`Play API error: ${JSON.stringify(err)}`);
        return { isValid: false, expiryTimeMs: 0, autoRenewing: false, paymentState: 0, orderId: '', countryCode: '' };
      }

      const data = await res.json() as any;

      // paymentState: 0=pending, 1=received, 2=free trial, 3=deferred
      const isValid = data.paymentState === 1 || data.paymentState === 2;

      return {
        isValid,
        expiryTimeMs: parseInt(data.expiryTimeMillis, 10),
        autoRenewing: data.autoRenewing === true,
        paymentState: data.paymentState,
        orderId:      data.orderId      || '',
        countryCode:  data.countryCode  || 'IN',
      };
    } catch (err) {
      this.logger.error('Play subscription verification failed', err);
      throw new InternalServerErrorException('Could not verify Google Play purchase');
    }
  }

  // ─── Acknowledge Purchase ─────────────────────────────────
  // Must acknowledge within 3 days or Google auto-refunds

  async acknowledgePurchase(
    productId:     string,
    purchaseToken: string,
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const url   = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${this.packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`;

      const res = await fetch(url, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok && res.status !== 204) {
        this.logger.error(`Acknowledge failed: ${res.status}`);
      } else {
        this.logger.log(`Play purchase acknowledged: ${productId}`);
      }
    } catch (err) {
      this.logger.error('Play acknowledge failed', err);
      // Non-fatal — log and continue, retry can be done later
    }
  }

  // ─── Map Play product ID to internal plan ─────────────────

  mapProductIdToPlanId(productId: string): number | null {
    const map: Record<string, number> = {
      'ott_basic_monthly':   2,
      'ott_premium_monthly': 3,
      'ott_family_monthly':  4,
      'ott_basic_yearly':    2,
      'ott_premium_yearly':  3,
    };
    return map[productId] ?? null;
  }
}
