#!/usr/bin/env bash
# =============================================================
# OTT Platform — Production Deploy Script
# Run from repo root on Hetzner CX23
# =============================================================
set -euo pipefail

COMPOSE="docker compose -f docker-compose.yml"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}   $1"; }
err()  { echo -e "${RED}[ERROR]${NC}  $1"; exit 1; }

# ── Pre-flight checks ─────────────────────────────────────────
log "Checking prerequisites..."
command -v docker   >/dev/null 2>&1 || err "Docker not installed"
command -v psql     >/dev/null 2>&1 || warn "psql not found (skipping local migration check)"
[ -f .env ]         || err ".env file missing — copy from .env.example and fill values"

# Source env
set -a; source .env; set +a

# ── Pull latest images ────────────────────────────────────────
log "Pulling base images..."
$COMPOSE pull postgres redis meilisearch prometheus grafana loki 2>/dev/null || true

# ── Build application images ──────────────────────────────────
log "Building API image..."
$COMPOSE build --no-cache api

log "Building Worker image..."
$COMPOSE build --no-cache worker

log "Building CMS image..."
$COMPOSE build --no-cache cms

# ── Start infrastructure first ────────────────────────────────
log "Starting infrastructure services..."
$COMPOSE up -d postgres redis meilisearch

log "Waiting for PostgreSQL to be ready..."
timeout 60 bash -c 'until docker compose exec -T postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB 2>/dev/null; do sleep 2; done'
log "PostgreSQL is ready"

# ── Run migrations ────────────────────────────────────────────
log "Running database migration..."
docker compose exec -T postgres psql \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f /dev/stdin < backend/src/database/migrations/001_initial_schema.sql
log "Migration complete"

# ── Start application services ────────────────────────────────
log "Starting API server..."
$COMPOSE up -d api

log "Waiting for API health check..."
timeout 60 bash -c 'until curl -sf http://localhost:3000/health/live >/dev/null 2>&1; do sleep 3; done'
log "API is healthy"

log "Starting remaining services..."
$COMPOSE up -d cms nginx worker prometheus grafana loki

# ── Verify all containers ─────────────────────────────────────
log "Container status:"
$COMPOSE ps

# ── Run seeds (idempotent) ────────────────────────────────────
log "Running database seeds..."
$COMPOSE exec -T api node dist/database/seeds/run-seeds.js 2>/dev/null || \
    warn "Seeds skipped (may need: npm run seed from backend/)"

log ""
log "═══════════════════════════════════════════"
log "  OTT Platform deployed successfully! 🚀"
log "  API:      https://$DOMAIN/api/v1"
log "  CMS:      https://$DOMAIN/admin/"
log "  Health:   https://$DOMAIN/health"
log "  Grafana:  https://$DOMAIN/grafana/"
log "═══════════════════════════════════════════"
