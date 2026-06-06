#!/usr/bin/env bash
# Full system health check
set -a; source .env 2>/dev/null; set +a

PASS=0; FAIL=0
check() {
  local name="$1" cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name"
    FAIL=$((FAIL+1))
  fi
}

echo "=== OTT Platform Health Check ==="
check "PostgreSQL"   "docker compose exec -T postgres pg_isready -U $POSTGRES_USER"
check "Redis"        "docker compose exec -T redis redis-cli -a $REDIS_PASSWORD ping"
check "API /health"  "curl -sf http://localhost:3000/health/live"
check "Meilisearch"  "curl -sf http://localhost:7700/health"
check "Worker"       "curl -sf http://localhost:9091/health"
check "Nginx"        "curl -sf http://localhost/health"

echo ""
echo "Result: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] || exit 1
