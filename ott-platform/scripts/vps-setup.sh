#!/usr/bin/env bash
# =============================================================
# Hetzner CX23 — First-time VPS setup
# Run once as root after provisioning: bash vps-setup.sh
# =============================================================
set -euo pipefail

DEPLOY_USER="${1:-ott}"
DOMAIN="${2:-ssooss.store}"

echo "=== OTT Platform VPS Setup ==="
echo "User: $DEPLOY_USER | Domain: $DOMAIN"

# ── System update ─────────────────────────────────────────────
apt-get update -q && apt-get upgrade -yq
apt-get install -yq \
    curl wget git unzip \
    ufw fail2ban \
    htop iotop ncdu \
    postgresql-client \
    jq

# ── Create deploy user ────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    mkdir -p /home/$DEPLOY_USER/.ssh
    cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/ 2>/dev/null || true
    chmod 700 /home/$DEPLOY_USER/.ssh
    chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true
    chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker compose" >> /etc/sudoers
    echo "Created user: $DEPLOY_USER"
fi

# ── Firewall ──────────────────────────────────────────────────
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP"
ufw allow 443/tcp   comment "HTTPS"
ufw --force enable
echo "UFW configured"

# ── Fail2Ban ──────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime  = 3600
maxretry = 5
findtime = 600

[sshd]
enabled  = true
port     = ssh
maxretry = 3
bantime  = 86400

[nginx-req-limit]
enabled  = true
filter   = nginx-req-limit
logpath  = /var/log/nginx/error.log
maxretry = 10
F2B

systemctl enable fail2ban && systemctl restart fail2ban
echo "Fail2Ban configured"

# ── Docker ────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$DEPLOY_USER"
    systemctl enable docker
    echo "Docker installed"
fi

# Docker daemon tuning
cat > /etc/docker/daemon.json << 'DOCKER'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
DOCKER
systemctl reload docker

# ── Application directory ─────────────────────────────────────
mkdir -p /opt/ott
chown -R $DEPLOY_USER:$DEPLOY_USER /opt/ott

mkdir -p /var/log/ott-worker /var/log/ott-backup
chown -R $DEPLOY_USER:$DEPLOY_USER /var/log/ott-worker /var/log/ott-backup

# ── Sysctl tuning for high-connection workloads ───────────────
cat >> /etc/sysctl.conf << 'SYSCTL'
# OTT Platform tuning
net.core.somaxconn          = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog  = 65535
fs.file-max                 = 200000
vm.swappiness               = 10
SYSCTL
sysctl -p

# ── Swap (safety net on 8GB RAM) ──────────────────────────────
if ! swapon --show | grep -q swap; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "2GB swap created"
fi

echo ""
echo "=== VPS Setup Complete ==="
echo "Next steps:"
echo "  1. SSH as $DEPLOY_USER: ssh $DEPLOY_USER@<ip>"
echo "  2. Clone repo: git clone <repo> /opt/ott"
echo "  3. Copy .env: cp /opt/ott/.env.example /opt/ott/.env && vi /opt/ott/.env"
echo "  4. Deploy: bash /opt/ott/scripts/deploy.sh"
