import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv:     process.env.NODE_ENV || 'development',
  port:        parseInt(process.env.PORT || '3000', 10),
  domain:      process.env.DOMAIN || 'localhost',

  jwt: {
    secret:          process.env.JWT_SECRET,
    refreshSecret:   process.env.JWT_REFRESH_SECRET,
    accessExpires:   process.env.JWT_ACCESS_EXPIRES  || '15m',
    refreshExpires:  process.env.JWT_REFRESH_EXPIRES || '30d',
  },

  cloudflare: {
    accountId:      process.env.CF_ACCOUNT_ID,
    r2AccessKey:    process.env.CF_R2_ACCESS_KEY,
    r2SecretKey:    process.env.CF_R2_SECRET_KEY,
    r2Bucket:       process.env.CF_R2_BUCKET || 'ott-media',
    r2Endpoint:     process.env.CF_R2_ENDPOINT,
    signedUrlSecret: process.env.CF_SIGNED_URL_SECRET,
    signedUrlTtl:   parseInt(process.env.CF_SIGNED_URL_TTL || '3600', 10),
    zoneId:         process.env.CF_ZONE_ID,
    apiToken:       process.env.CF_API_TOKEN,
  },

  razorpay: {
    keyId:    process.env.RAZORPAY_KEY_ID,
    secret:   process.env.RAZORPAY_SECRET,
    webhook:  process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
  },

  meilisearch: {
    url:    process.env.MEILISEARCH_URL || 'http://meilisearch:7700',
    apiKey: process.env.MEILISEARCH_KEY,
  },

  smtp: {
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
    from:   process.env.SMTP_FROM || 'noreply@ssooss.store',
  },

  redis: {
    host:     process.env.REDIS_HOST || 'redis',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  upload: {
    tmpDir:     process.env.UPLOAD_TMP_DIR || '/app/uploads',
    maxSizeGb:  parseInt(process.env.UPLOAD_MAX_SIZE_GB || '5', 10),
  },

  streaming: {
    maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS || '3', 10),
    hlsTokenTtl:         parseInt(process.env.HLS_TOKEN_TTL || '3600', 10),
  },
}));
