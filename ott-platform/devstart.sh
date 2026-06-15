#!/usr/bin/env bash
# ============================================================
# devstart.sh — OTT Platform Development Starter
# ============================================================
# Starts:
#   1. Infrastructure (Postgres, Redis, Meilisearch, MinIO)    via Docker Compose
#   2. NestJS API        (backend/)      — npm run start:dev   → :3000
#   3. Vite CMS Frontend (cms-frontend/) — npm run dev         → :5174
#   4. Transcoding Worker (worker/)      — npm run start:dev
#
# Usage:  ./devstart.sh [--no-infra] [--no-worker]
#   --no-infra    Skip Docker infrastructure startup (if already running)
#   --no-worker   Skip the FFmpeg transcoding worker
#
# Login fix: always forces VITE_API_URL=/api/v1 so the Vite proxy
# is used — prevents GitHub Codespaces OAuth from blocking API requests.
# ============================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────
BOLD="\033[1m"
RESET="\033[0m"
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
MAGENTA="\033[0;35m"
BLUE="\033[0;34m"

log()    { echo -e "${BOLD}${GREEN}[devstart]${RESET} $*"; }
info()   { echo -e "${CYAN}[info]${RESET} $*"; }
warn()   { echo -e "${YELLOW}[warn]${RESET} $*"; }
error()  { echo -e "${RED}[error]${RESET} $*" >&2; }
section(){ echo -e "\n${BOLD}${BLUE}━━━ $* ━━━${RESET}\n"; }

# ── Parse flags ───────────────────────────────────────────────
START_INFRA=true
START_WORKER=true
for arg in "$@"; do
  case "$arg" in
    --no-infra)  START_INFRA=false  ;;
    --no-worker) START_WORKER=false ;;
    -h|--help)
      echo "Usage: $0 [--no-infra] [--no-worker]"
      exit 0
      ;;
    *)
      error "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ── Resolve project root (directory of this script) ───────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/cms-frontend"
WORKER_DIR="$SCRIPT_DIR/worker"
LOG_DIR="$SCRIPT_DIR/.dev-logs"

mkdir -p "$LOG_DIR"

# ── PID tracking for cleanup ──────────────────────────────────
PIDS=()

cleanup() {
  section "Shutting down dev processes"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      info "Stopped PID $pid"
    fi
  done

  if $START_INFRA; then
    info "Stopping Docker infrastructure..."
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" \
      stop postgres redis meilisearch minio minio-init 2>/dev/null || true
  fi
  log "All services stopped. Goodbye! 👋"
}
trap cleanup EXIT INT TERM

# ── Utility: wait for a TCP port (pure bash, no netcat needed) ─
wait_for_port() {
  local name="$1" host="$2" port="$3" timeout="${4:-60}"
  local elapsed=0
  printf "${CYAN}[info]${RESET} Waiting for %s (%s:%s)" "$name" "$host" "$port"
  while ! (echo > /dev/tcp/"$host"/"$port") 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))
    printf "."
    if [[ $elapsed -ge $timeout ]]; then
      echo ""
      error "Timed out waiting for $name on $host:$port after ${timeout}s"
      exit 1
    fi
  done
  echo " ${GREEN}ready${RESET}"
}

# ── Utility: prefix-coloured tail ─────────────────────────────
run_service() {
  local name="$1" colour="$2" log_file="$3"
  shift 3
  # Spawn the command, tee to log, and prefix each line
  "$@" 2>&1 | tee "$log_file" | \
    awk -v n="$name" -v c="$colour" -v r="$RESET" \
      '{ printf "%s[%s]%s %s\n", c, n, r, $0; fflush() }' &
  PIDS+=($!)
}

# ════════════════════════════════════════════════════════════════
section "OTT Platform — Development Mode"
log "Project root : $SCRIPT_DIR"
log "Log directory: $LOG_DIR"
log "Flags        : infra=${START_INFRA}, worker=${START_WORKER}"
echo ""

# ── Prerequisites check ───────────────────────────────────────
section "Checking prerequisites"
MISSING=()
for cmd in node npm docker; do
  if command -v "$cmd" &>/dev/null; then
    info "$cmd → $(command -v $cmd)"
  else
    warn "$cmd not found"
    MISSING+=("$cmd")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  error "Missing required tools: ${MISSING[*]}"
  error "Please install them and re-run devstart.sh"
  exit 1
fi

# ── Node version ──────────────────────────────────────────────
NODE_VER=$(node --version)
info "Node.js : $NODE_VER"
info "npm     : $(npm --version)"
echo ""

# ════════════════════════════════════════════════════════════════
# ── Fix: ensure frontend always uses the Vite proxy path ──────
#
# When running in GitHub Codespaces the direct port-3000 URL is
# gated by GitHub OAuth so the browser cannot call it directly.
# Forcing VITE_API_URL=/api/v1 makes every API call go through
# Vite's built-in proxy (cms-frontend/vite.config.ts):
#   /api  →  http://localhost:3000
# This is server-side (Node → Node), bypassing the browser auth.
# ──────────────────────────────────────────────────────────────
section "Configuring frontend API URL"
ENV_LOCAL="$FRONTEND_DIR/.env.local"
cat > "$ENV_LOCAL" <<'ENVEOF'
# Use Vite proxy so the browser never hits port 3000 directly.
# Required for GitHub Codespaces (port 3000 is OAuth-gated).
VITE_API_URL=/api/v1
ENVEOF
info "Set VITE_API_URL=/api/v1 in cms-frontend/.env.local ✓"
info "(Vite proxy: /api → http://localhost:3000)"

# ════════════════════════════════════════════════════════════════
if $START_INFRA; then
  section "Starting Docker infrastructure"
  info "Pulling / starting: postgres, redis, meilisearch, minio"

  docker compose -f "$SCRIPT_DIR/docker-compose.yml" \
    up -d --remove-orphans \
    postgres redis meilisearch minio minio-init

  # Wait for core services
  wait_for_port "PostgreSQL"   localhost 5432 90
  wait_for_port "Redis"        localhost 6379 60
  wait_for_port "Meilisearch"  localhost 7700 60
  wait_for_port "MinIO"        localhost 9000 60

  log "All infrastructure services are up ✓"
else
  warn "--no-infra flag set; skipping Docker startup (assuming services already running)"
  wait_for_port "PostgreSQL"  localhost 5432 10
  wait_for_port "Redis"       localhost 6379 10
fi

# ════════════════════════════════════════════════════════════════
section "Installing / verifying dependencies"

for dir_label in "$BACKEND_DIR:backend" "$FRONTEND_DIR:cms-frontend" "$WORKER_DIR:worker"; do
  dir="${dir_label%%:*}"
  label="${dir_label##*:}"
  if [[ ! -d "$dir/node_modules" ]]; then
    info "Installing npm packages for $label..."
    npm install --prefix "$dir" --silent
  else
    info "$label node_modules OK"
  fi
done

# ════════════════════════════════════════════════════════════════
section "Running database migrations and seeds"

info "Executing schema migration 001..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres psql \
  -U ott_user -d ott_db < "$BACKEND_DIR/src/database/migrations/001_initial_schema.sql"

info "Executing schema migration 002..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres psql \
  -U ott_user -d ott_db < "$BACKEND_DIR/src/database/migrations/002_subscription_schema.sql"

info "Executing schema migration 003..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres psql \
  -U ott_user -d ott_db < "$BACKEND_DIR/src/database/migrations/003_feature_media_urls.sql"

info "Running seeds..."
npm --prefix "$BACKEND_DIR" run seed || warn "Seeds failed (possibly already seeded)"

# ════════════════════════════════════════════════════════════════
section "Starting application services"

# ── 1. NestJS API backend ─────────────────────────────────────
info "Starting NestJS API → http://localhost:3000"
run_service "api    " "\033[0;34m" "$LOG_DIR/backend.log" \
  npm --prefix "$BACKEND_DIR" run start:dev

sleep 2   # give nest a head-start before frontend tries to proxy

# ── 2. Vite CMS frontend ──────────────────────────────────────
info "Starting Vite CMS frontend → http://localhost:5174"
run_service "cms    " "\033[0;35m" "$LOG_DIR/frontend.log" \
  npm --prefix "$FRONTEND_DIR" run dev

# ── 3. FFmpeg transcoding worker ─────────────────────────────
if $START_WORKER; then
  info "Starting transcoding worker"
  run_service "worker " "\033[0;33m" "$LOG_DIR/worker.log" \
    npm --prefix "$WORKER_DIR" run start:dev
fi

# ════════════════════════════════════════════════════════════════
section "All services launched 🚀"
echo -e "  ${CYAN}API Backend ${RESET} → ${BOLD}http://localhost:3000${RESET}   (logs: .dev-logs/backend.log)"
echo -e "  ${MAGENTA}CMS Frontend${RESET} → ${BOLD}http://localhost:5174${RESET}   (logs: .dev-logs/frontend.log)"
if $START_WORKER; then
  echo -e "  ${YELLOW}Worker      ${RESET} → running in background   (logs: .dev-logs/worker.log)"
fi
if $START_INFRA; then
  echo -e "  ${GREEN}MinIO UI    ${RESET} → ${BOLD}http://localhost:9001${RESET}   (user: minio_admin / minio_password_123)"
  echo -e "  ${GREEN}Meilisearch ${RESET} → ${BOLD}http://localhost:7700${RESET}"
fi
echo ""
echo -e "${BOLD}┌─────────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}│  Login: admin@ssooss.store / Admin@1234     │${RESET}"
echo -e "${BOLD}└─────────────────────────────────────────────┘${RESET}"
echo ""
echo -e "${BOLD}Press Ctrl+C to stop all services.${RESET}"
echo ""

# ── Keep script alive; wait for all background children ───────
wait
