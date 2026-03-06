#!/usr/bin/env bash
# setup.sh — One-time system setup for Minstrel Codex Pi kiosk
# Run as: sudo bash setup.sh
# Tested on Raspberry Pi OS Lite (64-bit)

set -e

echo "=== Minstrel Codex Pi Kiosk Setup ==="

# ── System packages ──────────────────────────────────────────────
echo "[1/5] Installing system packages..."
apt-get update -y
apt-get install -y \
  xorg \
  openbox \
  chromium-browser \
  unclutter \
  curl \
  git \
  usbmount \
  --no-install-recommends

# ── nvm + Node 20 ────────────────────────────────────────────────
echo "[2/5] Installing nvm and Node 20..."
export NVM_DIR="/home/pi_experiments/.nvm"
sudo -u pi_experiments bash -c "
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
  nvm install 20
  nvm alias default 20
"

# ── serve ─────────────────────────────────────────────────────────
echo "[3/5] Installing serve..."
sudo -u pi_experiments bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
  npm install -g serve
"

# ── App directory ─────────────────────────────────────────────────
echo "[4/5] Creating app directory..."
APP_DIR="/home/pi_experiments/minstrel-codex"
mkdir -p "$APP_DIR"
chown pi_experiments:pi_experiments "$APP_DIR"

# ── sudoers for mount (usbmount) ──────────────────────────────────
echo "[5/5] Configuring usbmount..."
# usbmount config — allow auto-mount to /media/usb*
sed -i 's/^MOUNTOPTIONS=.*/MOUNTOPTIONS="sync,noexec,nodev,noatime,nodiratime"/' /etc/usbmount/usbmount.conf 2>/dev/null || true

echo ""
echo "=== Setup complete ==="
echo "Next: copy apps/web/dist/ to a USB drive, plug it in, then run install.sh"
