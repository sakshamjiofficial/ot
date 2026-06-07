# Kaler — OTT Video Streaming Platform

A production-ready, feature-rich Over-The-Top (OTT) video streaming platform. It features adaptive HLS transcoding, user subscription management, billing, notifications, search indexing, and a full administrative CMS panel.

---

## 🏗️ Architecture Overview

The platform is designed around a microservices/modular architecture consisting of a NestJS backend, a Vite React administrative dashboard, an autonomous transcoding worker, and local containerized infrastructure services.

```mermaid
graph TD
    Client[Browser / Client App] -->|HTTPS| CMS[Vite React CMS Panel]
    Client -->|HTTPS| Backend[NestJS API Gateway]
    Backend -->|SQL| DB[(PostgreSQL Database)]
    Backend -->|Read/Write| Redis[(Redis Queue / Cache)]
    Backend -->|Search Query| Meili[(Meilisearch Engine)]
    Backend -->|Generate Upload URLs| S3[(MinIO Object Storage)]
    
    Worker[Transcoding Worker] -->|Listen Jobs| Redis
    Worker -->|Fetch Raw / Save HLS| S3
    Worker -->|Update Status| DB
```

---

## 📁 Repository Layout

```
kaler/
├── ott-platform/
│   ├── backend/         # NestJS REST API Server
│   ├── cms-frontend/    # React (Vite, TailwindCSS) Admin Dashboard
│   ├── worker/          # Transcoding & HLS Video Processing Service
│   ├── docker-compose.yml # PostgreSQL, Redis, MinIO, Meilisearch
│   └── SETUP.md         # Detailed VPS & Deployment Guidelines
├── android/             # Native Android Client Application
└── README.md            # Project Workspace Documentation (This File)
```

---

## 🚀 Environment Phases Matrix

The table below contrasts the configuration, commands, and infrastructure components used in the **Development** versus **Production** phases:

| Parameter | 🛠️ Development Phase (Local / Codespaces) | 🌐 Production Phase (VPS / Cloud Hosting) |
|---|---|---|
| **NODE_ENV** | `development` | `production` |
| **Backend API** | `npm run start:dev` (Watch mode, NestJS port `3000`) | `npm run build` followed by PM2 / Docker container execution |
| **CMS Panel** | `npm run dev` (Vite dev server, port `5174`) | `npm run build` serving static assets via Nginx with compression |
| **Video Worker** | `npm run start:dev` (Watch mode) | `npm run build` followed by PM2 / node process on a high-CPU instance |
| **Object Storage** | Local MinIO Container (S3-compatible, port `9000`) | Cloudflare R2 / AWS S3 Bucket |
| **Media Assets CDN** | Local URL: `http://localhost:9000/ott-media` | Custom CDN subdomain: `https://cdn.yourdomain.com` |
| **Database** | Local PostgreSQL Container (`localhost:5432`) | Production Database (e.g. AWS RDS or highly available PostgreSQL VPS) |
| **Queue / Cache** | Local Redis Container (`localhost:6379`) | Managed Redis cluster with persistent storage enabled |
| **Search Engine** | Local Meilisearch Container (`localhost:7700`) | Production Meilisearch instance with cluster search keys |
| **SSL / TLS** | HTTP (or HTTP loopback behind Codespace HTTPS proxy) | Enforced HTTPS (Nginx reverse proxy + SSL certificates via Let's Encrypt) |
| **API Credentials** | Sandbox/Mock keys (Razorpay, Firebase mock mode) | Production/Live credentials (Razorpay Live, FCM private key files) |

---

## ⚡ Local Development Setup

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **Docker & Docker Compose** (for database & storage containers)
- **FFmpeg** (installed on host/worker machine for video probes/transcoding)

### 2. Start Infrastructure Services
Spin up PostgreSQL, Redis, Meilisearch, and MinIO S3:
```bash
cd ott-platform
docker compose up -d
```
*MinIO bucket initialization will run automatically via `minio-init` to configure the `ott-media` bucket and public access policies.*

### 3. Launch NestJS Backend API
```bash
cd ott-platform/backend
npm install
npm run start:dev
```
*API will compile and run in watch mode on port `3000`.*

### 4. Launch Transcoding Worker
```bash
cd ott-platform/worker
npm install
npm run start:dev
```
*Worker will run on host and process transcoding jobs from the Redis queue.*

### 5. Launch CMS Admin Panel
```bash
cd ott-platform/cms-frontend
npm install
npm run dev
```
*Frontend admin UI will run in watch mode on port `5174`.*

---

## ⚙️ GitHub Codespaces Configuration

If running within GitHub Codespaces, secure S3 presigned URL uploads from the browser require specific port configurations:

1. **Port Attributes**: Port `9000` (MinIO API) must be configured to automatically forward and be visible **publicly** to allow HTTPS uploads from the client browser without OAuth blockage.
   *This has been configured programmatically inside the workspace settings at [settings.json](file:///.vscode/settings.json).*
2. **Environment File Configuration**: Ensure the following values are set in `backend/.env` and `worker/.env` to reference the public codespace endpoint:
   ```env
   CF_R2_ENDPOINT=https://<codespace-name>-9000.app.github.dev
   CF_R2_PUBLIC_URL=https://<codespace-name>-9000.app.github.dev/ott-media
   ```

---

## 🎬 Managing TV Series & Episodes

The administrative workflow handles TV Series structure dynamically:

1. **TV Series Actions**: In the **Series** view, rather than uploading a single video file, administrators can click the **Manage Episodes** (`Tv` icon) row action.
2. **Seasons management**: Create and list seasons (e.g. Season 1, Season 2) inside the series detail tab view.
3. **Episode management**: Within a season, add, edit, and delete episodes (specifying episode number, title, description, duration, and premium status).
4. **Video Uploads**: Select an episode and click **Upload Video** to launch the multipart video chunk uploader. This initiates the transcode worker and feeds live queue statuses to the dashboard.