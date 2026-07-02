#!/usr/bin/env bash
# =============================================================================
#  Mystics Audit — Ubuntu deployment script
#  Target: /home/automystics-mysticsaudit/htdocs/mysticsaudit.automystics.tech
#
#  Usage on server:
#    chmod +x deploy.sh
#    ./deploy.sh              # full deploy (pull + install + build + restart)
#    ./deploy.sh --build-only # skip git pull (re-build only)
#    ./deploy.sh --restart    # skip build, just restart PM2
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DEPLOY_DIR="/home/automystics-mysticsaudit/htdocs/mysticsaudit.automystics.tech"
REPO_URL="https://github.com/YOUR_ORG/YOUR_REPO.git"   # ← change this
BRANCH="main"

FRONTEND_DIST="$DEPLOY_DIR/artifacts/mystics-audit/dist/public"
ENV_FILE="$DEPLOY_DIR/.env.production"

LOG="$DEPLOY_DIR/deploy.log"

# Colours
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[deploy]${NC} $*" | tee -a "$LOG"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*" | tee -a "$LOG"; }
error() { echo -e "${RED}[error]${NC} $*" | tee -a "$LOG"; exit 1; }

echo "" | tee -a "$LOG"
info "========== Deploy started at $(date) =========="

# ── Parse flags ───────────────────────────────────────────────────────────────
BUILD_ONLY=false
RESTART_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--build-only"  ]] && BUILD_ONLY=true
  [[ "$arg" == "--restart"     ]] && RESTART_ONLY=true
done

# ── Verify env file exists ────────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || error ".env.production not found at $ENV_FILE — copy .env.production.example and fill in values"
set -a; source "$ENV_FILE"; set +a
info "Environment loaded from $ENV_FILE"

# ── Check required tools ──────────────────────────────────────────────────────
for cmd in git node pnpm pm2 nginx; do
  command -v "$cmd" &>/dev/null || error "'$cmd' is not installed. Run: sudo apt install $cmd  (or npm i -g pm2)"
done

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
info "Node $NODE_VER · pnpm $(pnpm --version) · pm2 $(pm2 --version 2>/dev/null | head -1)"

# ── Step 1 — Clone or pull ────────────────────────────────────────────────────
if $RESTART_ONLY; then
  info "Skip: git pull (--restart mode)"
else
  if [[ -d "$DEPLOY_DIR/.git" ]]; then
    info "Pulling latest from $BRANCH…"
    cd "$DEPLOY_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH"
    git clean -fd
  else
    info "Cloning $REPO_URL → $DEPLOY_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
  fi
  info "Git: $(git log -1 --oneline)"
fi

cd "$DEPLOY_DIR"

# ── Step 2 — Install dependencies ────────────────────────────────────────────
if $RESTART_ONLY; then
  info "Skip: pnpm install (--restart mode)"
else
  info "Installing dependencies…"
  pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG"
fi

# ── Step 3 — Build ────────────────────────────────────────────────────────────
if $RESTART_ONLY; then
  info "Skip: build (--restart mode)"
else
  # 3a — Build shared libs first
  info "Building shared libraries…"
  pnpm run typecheck:libs 2>&1 | tee -a "$LOG"

  # 3b — Build API server
  info "Building API server…"
  pnpm --filter @workspace/api-server run build 2>&1 | tee -a "$LOG"

  # 3c — Build frontend (needs PORT + BASE_PATH at build time)
  info "Building frontend (BASE_PATH=$BASE_PATH)…"
  PORT=3000 BASE_PATH="${BASE_PATH:-/}" \
    pnpm --filter @workspace/mystics-audit run build 2>&1 | tee -a "$LOG"

  info "Frontend output: $FRONTEND_DIST"
  ls -lh "$FRONTEND_DIST" | head -5 | tee -a "$LOG"
fi

# ── Step 4 — DB migrations ────────────────────────────────────────────────────
info "Pushing DB schema…"
pnpm --filter @workspace/db run push 2>&1 | tee -a "$LOG"

# ── Step 5 — Start / restart PM2 ─────────────────────────────────────────────
info "Starting/restarting services via PM2…"
if pm2 list | grep -q "mystics-api"; then
  pm2 reload ecosystem.config.cjs --update-env 2>&1 | tee -a "$LOG"
else
  pm2 start ecosystem.config.cjs 2>&1 | tee -a "$LOG"
fi
pm2 save 2>&1 | tee -a "$LOG"

# ── Step 6 — Reload Nginx ─────────────────────────────────────────────────────
info "Reloading Nginx…"
sudo nginx -t 2>&1 | tee -a "$LOG"
sudo systemctl reload nginx 2>&1 | tee -a "$LOG"

# ── Done ──────────────────────────────────────────────────────────────────────
info "========== Deploy finished at $(date) =========="
echo ""
echo -e "${GREEN}✓ Deployed successfully!${NC}"
echo -e "  API   → http://localhost:${API_PORT:-8080}/api/healthz"
echo -e "  Site  → https://mysticsaudit.automystics.tech"
