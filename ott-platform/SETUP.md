# OTT Platform — Complete Setup Guide

> **Stack:** NestJS API · React CMS · Kotlin Android · FFmpeg Worker · PostgreSQL · Redis · Cloudflare R2 · Hetzner CX23

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Things You Must Change](#2-things-you-must-change)
3. [Cloudflare Setup](#3-cloudflare-setup)
4. [VPS First-Time Setup](#4-vps-first-time-setup)
5. [Database Setup](#5-database-setup)
6. [Backend API Setup](#6-backend-api-setup)
7. [FFmpeg Worker Setup](#7-ffmpeg-worker-setup)
8. [CMS Admin Panel Setup](#8-cms-admin-panel-setup)
9. [Android App Setup](#9-android-app-setup)
10. [Monitoring Setup](#10-monitoring-setup)
11. [Deployment Order](#11-deployment-order)
12. [Post-Deploy Checklist](#12-post-deploy-checklist)
13. [Razorpay Setup](#13-razorpay-setup)
14. [Google Play Billing Setup](#14-google-play-billing-setup)
15. [Firebase FCM Setup](#15-firebase-fcm-setup)
16. [Troubleshooting](#16-troubleshooting)
17. [Scaling Guide](#17-scaling-guide)

---

## 1. Prerequisites

### Server
- Hetzner CX23 VPS (3 vCPU ARM, 8 GB RAM, 80 GB SSD)
- Ubuntu 24.04 LTS
- Domain: **replace `ssooss.store` with your domain everywhere**

### Local machine (for building/deploying)
- Docker Desktop ≥ 24
- Node.js 20 LTS
- Android Studio Hedgehog (2023.1.1+) with JDK 17
- Git

### External accounts (all required)
| Service | Purpose | Cost |
|---|---|---|
| Hetzner | VPS hosting | ~€5.83/mo |
| Cloudflare | DNS + CDN + R2 storage | Free tier sufficient |
| Razorpay | Indian payment gateway | % per transaction |
| Firebase | Push notifications (FCM) | Free |
| Google Play Console | Android app distribution | $25 one-time |

---

## 2. Things You Must Change

### 2.1 Domain

Search and replace `ssooss.store` with your domain in:

```
backend/.env.example          → DOMAIN=
nginx/conf.d/api.conf          → server_name
nginx/conf.d/stream.conf       → (referenced in docs)
cms-frontend/.env.example      → VITE_API_URL
android/app/build.gradle       → API_BASE_URL, CDN_BASE_URL
android/app/src/main/AndroidManifest.xml → host attribute in deep link
scripts/deploy.sh              → echo statements
```

**Quick replace command (run from project root):**
```bash
find . -type f \( -name "*.ts" -o -name "*.yml" -o -name "*.conf" \
  -o -name "*.kt" -o -name "*.gradle" -o -name "*.md" \
  -o -name "*.env*" -o -name "*.sh" \) \
  -exec sed -i 's/ssooss\.store/YOUR_DOMAIN/g' {} +
```

### 2.2 Android Package Name

The Android package is `com.ott.app`. To change it:

1. In `android/app/build.gradle`:
   ```groovy
   applicationId "com.yourcompany.yourapp"
   ```
2. Rename directory: `java/com/ott/app/` → `java/com/yourcompany/yourapp/`
3. Update `package` declaration in every `.kt` file
4. Update `AndroidManifest.xml` `android:name` attributes

### 2.3 Secrets (NEVER commit these)

Copy `.env.example` to `.env` and fill every value marked `CHANGE_ME`:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env
```

Generate secure secrets:
```bash
# JWT secrets (64-char random)
openssl rand -hex 32    # JWT_SECRET
openssl rand -hex 32    # JWT_REFRESH_SECRET
openssl rand -hex 32    # CF_SIGNED_URL_SECRET
openssl rand -hex 16    # REDIS_PASSWORD
```

### 2.4 All Environment Variables Reference

```bash
# ── REQUIRED — platform will not start without these ──────────

DOMAIN=your-domain.com

# PostgreSQL
POSTGRES_DB=ott_db
POSTGRES_USER=ott_user
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://ott_user:<password>@postgres:5432/ott_db

# Redis
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:<password>@redis:6379

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>

# Cloudflare R2
CF_ACCOUNT_ID=<from Cloudflare dashboard>
CF_R2_ACCESS_KEY=<R2 API token access key>
CF_R2_SECRET_KEY=<R2 API token secret key>
CF_R2_BUCKET=ott-media
CF_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
CF_SIGNED_URL_SECRET=<64-char-hex>
CF_R2_PUBLIC_URL=https://ott-media.r2.dev  # or your custom domain

# ── REQUIRED for payments ─────────────────────────────────────

# Razorpay (get from razorpay.com/dashboard)
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXX
RAZORPAY_SECRET=<your-razorpay-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret-from-razorpay>

# Firebase (paste full JSON as single line)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# ── REQUIRED for search ───────────────────────────────────────

MEILISEARCH_KEY=<master-key-min-16-chars>

# ── OPTIONAL ──────────────────────────────────────────────────

# Google Play (for Android billing verification)
GOOGLE_PLAY_SERVICE_ACCOUNT={"type":"service_account",...}

# SMTP (for email invoices/notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@your-domain.com
SMTP_PASS=<app-password>

# Grafana
GRAFANA_PASSWORD=<strong-password>

# Trial days
FREE_TRIAL_DAYS=7

# Worker tuning
WORKER_CONCURRENCY=2
MAX_CPU_PERCENT=80
```

---

## 3. Cloudflare Setup

### 3.1 DNS

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Add your domain
3. Change nameservers at your registrar to Cloudflare's
4. Add DNS record: `A  @  <your-hetzner-ip>` (Proxied ✓)

### 3.2 SSL/TLS

1. Go to **SSL/TLS → Overview**
2. Set mode to **Full (strict)**
3. Go to **SSL/TLS → Origin Server**
4. Click **Create Certificate**
5. Download `origin.pem` and `origin-key.pem`
6. Upload to VPS: `scp origin.pem origin-key.pem user@<ip>:/opt/ott/nginx/ssl/`

### 3.3 R2 Bucket

1. Go to **R2 → Create bucket**
2. Name: `ott-media`
3. Location: Auto (or `APAC` for India)
4. Go to **R2 → Manage R2 API Tokens**
5. Create token with:
   - Permissions: **Object Read & Write**
   - Specify bucket: `ott-media`
6. Copy `Access Key ID` → `CF_R2_ACCESS_KEY`
7. Copy `Secret Access Key` → `CF_R2_SECRET_KEY`
8. Copy Account ID from URL → `CF_ACCOUNT_ID`
9. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

### 3.4 R2 Public Access

1. In R2 bucket → **Settings → Public Access**
2. Enable **R2.dev subdomain** (free)
3. Or connect custom domain (e.g. `cdn.your-domain.com`)
4. Set `CF_R2_PUBLIC_URL` accordingly

### 3.5 Cache Rules (set in Cloudflare Rules → Cache Rules)

| Path Pattern | Cache Setting | TTL |
|---|---|---|
| `*.ts` files | Cache Everything | 1 year |
| `*.m3u8` files | Cache Everything | 5 minutes |
| `*.webp`, `*.jpg` | Cache Everything | 1 day |
| `*.vtt` files | Cache Everything | 1 day |
| `/api/*` | Bypass Cache | — |

### 3.6 WAF Rules (optional but recommended)

1. Go to **Security → WAF → Custom Rules**
2. Add rule: Block requests to `/api/auth/login` where rate > 10/min per IP
3. Enable **Bot Fight Mode** (free)

---

## 4. VPS First-Time Setup

```bash
# SSH into your Hetzner VPS as root
ssh root@<your-vps-ip>

# Upload and run the setup script
scp scripts/vps-setup.sh root@<ip>:/tmp/
ssh root@<ip> "bash /tmp/vps-setup.sh ott your-domain.com"

# After script completes, reconnect as the new user
ssh ott@<your-vps-ip>

# Clone your repository
cd /opt/ott
git clone <your-repo-url> .

# Copy and configure environment
cp .env.example .env
nano .env   # Fill in all values

# Install nginx SSL certs
mkdir -p nginx/ssl
# Upload your Cloudflare origin cert:
# scp origin.pem origin-key.pem ott@<ip>:/opt/ott/nginx/ssl/
```

---

## 5. Database Setup

### 5.1 First-time migration

```bash
cd /opt/ott

# Start PostgreSQL only
docker compose up -d postgres

# Wait for it to be healthy
docker compose exec postgres pg_isready -U ott_user -d ott_db

# Run migration 001 (schema + seed data)
docker compose exec -T postgres psql \
  -U ott_user -d ott_db \
  < backend/src/database/migrations/001_initial_schema.sql

# Run migration 002 (subscriptions)
docker compose exec -T postgres psql \
  -U ott_user -d ott_db \
  < backend/src/database/migrations/002_subscription_schema.sql

# Run seeds (creates superadmin + test content)
docker compose run --rm api node dist/database/seeds/run-seeds.js
```

Default superadmin credentials (change immediately after first login):
- **Email:** `admin@ssooss.store` → change to `admin@your-domain.com` in `run-seeds.ts`
- **Password:** `Admin@1234` → change immediately via CMS

### 5.2 Reset database (dev only)

```bash
docker compose down -v   # WARNING: deletes all data
docker compose up -d postgres
# Re-run migrations above
```

### 5.3 Backup & restore

```bash
# Manual backup
./scripts/backup-postgres.sh

# Backups stored in /var/backups/ott-postgres/
ls /var/backups/ott-postgres/

# Restore
./scripts/restore-postgres.sh /var/backups/ott-postgres/ott_db_20240101_020000.sql.gz

# Set up automated daily backups
./scripts/setup-cron.sh
```

---

## 6. Backend API Setup

### 6.1 Install dependencies locally (for development)

```bash
cd backend
npm install
```

### 6.2 Run in development

```bash
cd backend
cp .env.example .env  # fill values
npm run start:dev
# API at http://localhost:3000
# Swagger at http://localhost:3000/api/docs
```

### 6.3 Build and run with Docker

```bash
cd /opt/ott
docker compose build api
docker compose up -d api
docker compose logs -f api
```

### 6.4 Add @nestjs/schedule dependency

```bash
cd backend
npm install @nestjs/schedule cron
```

### 6.5 API health check

```bash
curl https://your-domain.com/health/live
# Expected: {"status":"ok"}

curl https://your-domain.com/health
# Full health: DB + memory + disk
```

---

## 7. FFmpeg Worker Setup

### 7.1 Local development

```bash
cd worker
npm install
cp .env.example .env  # fill R2 + Redis + DB values
npm run start:dev
```

### 7.2 Docker

```bash
docker compose build worker
docker compose up -d worker
docker compose logs -f worker
```

### 7.3 Scale workers (more parallel encodes)

```bash
# Run 2 worker containers (uses 2×CPU allocation)
docker compose up -d --scale worker=2 worker

# Check each worker's metrics
curl http://localhost:9091/metrics  # worker 1
```

### 7.4 FFmpeg tuning for CX23

In `worker/.env`:
```bash
WORKER_CONCURRENCY=2   # max 2 parallel jobs (3 vCPU limit)
MAX_CPU_PERCENT=80     # pause new jobs above 80% CPU
MAX_MEM_PERCENT=85     # pause new jobs above 85% RAM
FFMPEG_THREADS=0       # auto-detect (use all cores)
```

For faster encoding (lower quality): change `-preset faster` to `-preset veryfast` in `worker/src/services/ffmpeg.service.ts` line with `.addOutputOption('-preset', 'faster')`.

---

## 8. CMS Admin Panel Setup

### 8.1 Development

```bash
cd cms-frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:3000/api/v1
npm run dev
# CMS at http://localhost:5173
```

### 8.2 Production build

```bash
cd cms-frontend
echo "VITE_API_URL=/api/v1" > .env
npm run build
# Output in dist/
```

### 8.3 Docker (served via Nginx)

```bash
docker compose build cms
docker compose up -d cms
# Accessible at https://your-domain.com/admin/
```

### 8.4 Default admin login

After running seeds:
- URL: `https://your-domain.com/admin/`
- Email: `admin@your-domain.com`
- Password: `Admin@1234`

**Change this immediately in Settings after first login.**

---

## 9. Android App Setup

### 9.1 Prerequisites

- Android Studio Hedgehog+
- JDK 17 (`JAVA_HOME` set)
- Android SDK 34 installed

### 9.2 Configuration

**Step 1:** Change package name (if not `com.ott.app`):
- `android/app/build.gradle` → `applicationId`
- Rename `java/com/ott/app` directory tree
- Update package declarations in all `.kt` files

**Step 2:** Set API URLs in `android/app/build.gradle`:
```groovy
buildConfigField "String", "API_BASE_URL", "\"https://your-domain.com/api/v1\""
buildConfigField "String", "CDN_BASE_URL",  "\"https://your-cdn.r2.dev\""
```

**Step 3:** Add `google-services.json`:
- Firebase Console → Project Settings → Add Android app
- Download `google-services.json`
- Place at `android/app/google-services.json`

**Step 4:** Build
```bash
cd android
./gradlew assembleDebug    # Debug APK → app/build/outputs/apk/debug/
./gradlew assembleRelease  # Release APK (requires signing config)
```

### 9.3 Release signing

Create keystore:
```bash
keytool -genkey -v \
  -keystore ott-release.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias ott \
  -dname "CN=Your Name, OU=Mobile, O=Your Company, L=City, S=State, C=IN"
```

Add to `android/gradle.properties`:
```properties
KEYSTORE_PATH=../ott-release.jks
KEY_ALIAS=ott
KEY_PASSWORD=your_key_password
STORE_PASSWORD=your_store_password
```

Add signingConfig to `android/app/build.gradle`:
```groovy
signingConfigs {
    release {
        storeFile     file(KEYSTORE_PATH)
        storePassword STORE_PASSWORD
        keyAlias      KEY_ALIAS
        keyPassword   KEY_PASSWORD
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

### 9.4 Deep links

Update `AndroidManifest.xml` deep link host:
```xml
<data android:scheme="https" android:host="your-domain.com" android:pathPrefix="/watch" />
```

---

## 10. Monitoring Setup

### 10.1 Start monitoring stack

```bash
docker compose up -d prometheus grafana loki
```

### 10.2 Access Grafana

- URL: `https://your-domain.com/grafana/`
- Username: `admin`
- Password: value of `GRAFANA_PASSWORD` in `.env`

### 10.3 Add Prometheus data source in Grafana

1. Grafana → Connections → Add data source → Prometheus
2. URL: `http://prometheus:9090`
3. Save & Test

### 10.4 Add Loki data source

1. Grafana → Add data source → Loki
2. URL: `http://loki:3100`
3. Save & Test

### 10.5 Key metrics to monitor

| Metric | Description |
|---|---|
| `ott_active_streams` | Concurrent viewers right now |
| `ott_stream_starts_total` | Total stream sessions started |
| `ott_worker_jobs_processed_total` | Transcoding throughput |
| `ott_worker_queue_depth` | Encoding backlog |
| `ott_http_request_duration_ms` | API latency p95 |
| `ott_auth_failures_total` | Brute-force detection |

---

## 11. Deployment Order

Run this sequence for a fresh production deploy:

```bash
# 1. VPS setup (once only)
bash scripts/vps-setup.sh

# 2. Configure .env
cp .env.example .env && nano .env

# 3. Start infrastructure
docker compose up -d postgres redis meilisearch

# 4. Run migrations
docker compose exec -T postgres psql -U ott_user -d ott_db < backend/src/database/migrations/001_initial_schema.sql
docker compose exec -T postgres psql -U ott_user -d ott_db < backend/src/database/migrations/002_subscription_schema.sql

# 5. Build and start API
docker compose build api
docker compose up -d api

# 6. Verify API
curl https://your-domain.com/health/live

# 7. Start CMS
docker compose build cms
docker compose up -d cms nginx

# 8. Start worker
docker compose build worker
docker compose up -d worker

# 9. Start monitoring
docker compose up -d prometheus grafana loki

# 10. Run seeds
docker compose exec api node dist/database/seeds/run-seeds.js

# 11. Set up backups
bash scripts/setup-cron.sh
```

---

## 12. Post-Deploy Checklist

```
Infrastructure:
☐ All containers healthy: docker compose ps
☐ /health/live returns 200
☐ /health returns all green
☐ HTTPS working on your domain
☐ Cloudflare proxy active (orange cloud)
☐ Grafana accessible at /grafana/

Security:
☐ Changed default admin password (Admin@1234)
☐ Verified no secrets in git: git log --all -p | grep -i "password\|secret\|key"
☐ UFW active: ufw status
☐ Fail2Ban active: fail2ban-client status
☐ SSL/TLS mode set to "Full (strict)" in Cloudflare

Functionality:
☐ Can login to CMS admin panel
☐ Can create a movie entry
☐ Can upload a test video (use a short 30-second MP4)
☐ Worker picks up transcoding job
☐ All 4 renditions complete (check encoding queue)
☐ Signed stream URL works in browser
☐ Android app connects to API
☐ Push notification test works
☐ Razorpay test payment succeeds
☐ Invoice URL generated after payment

Performance:
☐ HLS segments cached by Cloudflare (check CF cache headers)
☐ API response time < 200ms for /movies
☐ Transcoding worker CPU < 80% during encode
```

---

## 13. Razorpay Setup

1. Sign up at [razorpay.com](https://razorpay.com)
2. Complete KYC (required for live payments)
3. Go to **Settings → API Keys**
4. Generate live key pair
5. Copy to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_live_XXXX
   RAZORPAY_SECRET=your_secret
   ```
6. Set up webhook:
   - Razorpay Dashboard → **Webhooks → Add New**
   - URL: `https://your-domain.com/api/v1/payment/webhook/razorpay`
   - Events: `payment.captured`, `payment.failed`, `subscription.charged`
   - Copy **Webhook Secret** → `RAZORPAY_WEBHOOK_SECRET`
7. Test with Razorpay test credentials first (`rzp_test_XXXX`)

### Razorpay Test Cards

| Card Number | Expiry | CVV | Result |
|---|---|---|---|
| 4111 1111 1111 1111 | Any future | Any | Success |
| 5267 3181 8797 5449 | Any future | Any | Success |
| 4000 0000 0000 0002 | Any future | Any | Failure |

**UPI Test:** Use `success@razorpay` as VPA for success.

---

## 14. Google Play Billing Setup

1. **Google Play Console** → Set up payments profile
2. **Google Cloud Console** → Enable **Android Publisher API**
3. Create Service Account:
   - Google Cloud → IAM → Service Accounts → Create
   - Role: No role (linked via Play Console)
   - Download JSON key
4. **Play Console** → Setup → API access → Link service account
5. Grant **Financial Data Viewer** + **Release Manager** permissions
6. Paste JSON as single line into `GOOGLE_PLAY_SERVICE_ACCOUNT`

### Play Product IDs

Map these in `google-play.service.ts` `mapProductIdToPlanId()`:

```
ott_basic_monthly   → Plan ID 2
ott_premium_monthly → Plan ID 3
ott_family_monthly  → Plan ID 4
ott_basic_yearly    → Plan ID 2
ott_premium_yearly  → Plan ID 3
```

Create matching subscription products in Play Console with the same IDs.

---

## 15. Firebase FCM Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project (or use existing)
3. Add Android app with your package name
4. Download `google-services.json` → place at `android/app/`
5. **Project Settings → Service Accounts → Generate New Private Key**
6. Download JSON → paste as `FIREBASE_SERVICE_ACCOUNT` in `.env`
7. Test push notification via CMS → Notifications page

### FCM Topics

Users auto-subscribe to topics in the Android app. Default topics:
- `general` — all users
- `premium` — active subscribers
- `new_release` — new content alerts
- `hindi`, `english`, `tamil` — language-based

---

## 16. Troubleshooting

### API won't start

```bash
docker compose logs api | tail -50
# Common causes:
# - DATABASE_URL wrong format
# - JWT_SECRET too short (need 32+ chars)
# - Port conflict on 3000
```

### Worker not picking up jobs

```bash
docker compose logs worker | tail -30
# Check: REDIS_URL correct, Redis is healthy
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

### Video stuck in "processing"

```bash
# Check job queue
curl -H "Authorization: Bearer <token>" \
  https://your-domain.com/api/v1/upload/queue-stats

# Check worker logs for FFmpeg errors
docker compose logs worker | grep "ERROR\|error" | tail -20

# Retry failed job via CMS → Encoding Queue → Retry button
```

### Signed HLS URL 401

```bash
# Verify CF_SIGNED_URL_SECRET matches between API and client
# Token TTL may have expired (default 1 hour)
# Check: curl -v "https://cdn.../path/master.m3u8?token=xxx&expires=yyy"
```

### CMS shows blank page

```bash
# Check browser console for CORS errors
# Verify VITE_API_URL points to correct API
# Check Nginx logs:
docker compose logs nginx | tail -20
```

### Razorpay webhook not firing

```bash
# Verify webhook URL is HTTPS (Razorpay requires TLS)
# Check signature: RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard
docker compose logs api | grep "webhook"
```

### Database connection pool exhausted

```bash
# Increase pool size in app.module.ts:
extra: { max: 30 }  # up from 20
# Or reduce connection-heavy queries
```

---

## 17. Scaling Guide

### When to upgrade from CX23

| Signal | Action |
|---|---|
| Encoding queue depth > 5 consistently | Add dedicated CX33 worker node |
| API response p95 > 500ms | Upgrade to CX33 (8 vCPU) |
| RAM usage > 7 GB | Upgrade to CX33 (16 GB RAM) |
| PostgreSQL queries slow | Add read replica (Hetzner managed DB) |

### Horizontal scaling (same Docker Compose)

```bash
# Multiple workers (same host)
docker compose up -d --scale worker=3 worker

# Multiple API instances (add Nginx upstream)
docker compose up -d --scale api=2 api
# Then update nginx/nginx.conf upstream block
```

### Separate worker node

```bash
# On worker-only Hetzner node:
# 1. Copy docker-compose.worker.yml (worker + redis client only)
# 2. Point to same Redis and PostgreSQL
# 3. docker compose -f docker-compose.worker.yml up -d
```

### CDN bandwidth (R2 egress is free)

R2 → Cloudflare CDN egress = **$0**.
You only pay for R2 storage: $0.015/GB/month.

At 100 movies (avg 4 GB each HLS): ~$6/month storage.
At 1000 concurrent viewers streaming 720p: ~$0 CDN cost.

---

## Project Structure Reference

```
ott-platform/
├── backend/                 NestJS API (Node.js)
│   ├── src/
│   │   ├── auth/            JWT + refresh token rotation
│   │   ├── content/         Movies, series, episodes, genres
│   │   ├── streaming/       Signed HLS URL generation
│   │   ├── upload/          Multipart R2 upload
│   │   ├── transcoding/     BullMQ job management
│   │   ├── subscriptions/   Plans, Razorpay, Play Billing
│   │   ├── payments/        Payment entities + services
│   │   ├── coupons/         Discount codes
│   │   ├── invoices/        HTML invoice → R2
│   │   ├── users/           User CRUD + device management
│   │   ├── common/          Guards, interceptors, filters
│   │   └── database/        Migrations + seeds
│   └── Dockerfile
│
├── worker/                  FFmpeg transcoding worker
│   └── src/
│       ├── processors/      Job orchestration
│       ├── services/        FFmpeg, R2, DB, Thumbnail
│       └── utils/           CPU guard, file utils, logger
│
├── cms-frontend/            React + Vite CMS admin
│   └── src/
│       ├── pages/           Dashboard, Content, Users, etc.
│       ├── components/      UI, DataTable, VideoUploader
│       ├── stores/          Zustand state
│       └── api/             Typed API client
│
├── android/                 Kotlin Android app
│   └── app/src/main/java/com/ott/app/
│       ├── data/            DTOs, Retrofit, Room, repositories
│       ├── domain/          Models, repository interfaces
│       ├── player/          ExoPlayer HLS manager
│       ├── presentation/    Compose screens + ViewModels
│       └── di/              Hilt modules
│
├── nginx/                   Reverse proxy config
├── monitoring/              Prometheus + Loki configs
├── scripts/                 Deploy, backup, restore, health
├── docker-compose.yml       All services orchestration
└── .env.example             All env vars template
```

---

*Generated by Claude — OTT Platform Architect*
*Last updated: Phase 2E (Auth + Content + Upload + Transcode + CMS + Android + Subscriptions)*
