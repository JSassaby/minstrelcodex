#!/usr/bin/env bash
# setup.sh — One-time system setup for Minstrel Codex Pi kiosk
# Run as the pi_experiments user (not root): bash setup.sh
# Tested on Raspberry Pi OS Lite Bookworm (64-bit), Raspberry Pi 5

set -e

echo "=== Minstrel Codex Pi Kiosk Setup ==="

# ── 1. Update packages ────────────────────────────────────────────
echo "[1/10] Updating packages..."
sudo apt update && sudo apt upgrade -y

# ── 2. Install required packages ─────────────────────────────────
echo "[2/10] Installing required packages..."
sudo apt install -y --no-install-recommends \
  chromium xorg xinit openbox \
  unclutter x11-xserver-utils curl

echo "[2b/10] Installing labwc (preferred) or falling back to openbox..."
sudo apt install -y labwc || sudo apt install -y openbox

# ── 3. Install Node.js 20 via nvm + serve ─────────────────────────
echo "[3/10] Installing nvm and Node.js 20..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

echo "Installing serve globally..."
npm install -g serve

echo "Copying serve to /usr/local/bin for system-wide access..."
sudo cp ~/.nvm/versions/node/v20*/bin/serve /usr/local/bin/serve

# ── 4. Create ~/kiosk.sh ──────────────────────────────────────────
echo "[4/10] Creating ~/kiosk.sh..."
cat > ~/kiosk.sh << 'EOF'
#!/bin/bash
# Start web server
/usr/local/bin/serve -s /home/pi_experiments/minstrelapp -l 3000 &
SERVER_PID=$!

# Wait until server responds (max 30 seconds)
for i in $(seq 1 30); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Launch Chromium
chromium --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-restore-session-state \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --app=http://localhost:3000

# If Chromium exits, kill the server
kill $SERVER_PID
EOF

# ── 5. Make kiosk.sh executable ───────────────────────────────────
echo "[5/10] Making kiosk.sh executable..."
chmod +x ~/kiosk.sh

# ── 6. Set up labwc autostart ─────────────────────────────────────
echo "[6/10] Configuring labwc autostart..."
mkdir -p ~/.config/labwc
cat > ~/.config/labwc/autostart << 'EOF'
/home/pi_experiments/kiosk.sh &
EOF

# ── 7. Set up autologin via systemd ───────────────────────────────
echo "[7/10] Configuring autologin..."
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi_experiments --noclear %I $TERM
EOF

# ── 8. Auto-start labwc on login via ~/.profile ───────────────────
echo "[8/10] Configuring auto-start in ~/.profile..."
if ! grep -q "exec labwc" ~/.profile 2>/dev/null; then
  cat >> ~/.profile << 'EOF'

if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec labwc
fi
EOF
fi

# ── 9. Enable systemd autologin ───────────────────────────────────
echo "[9/10] Enabling getty@tty1..."
sudo systemctl daemon-reload
sudo systemctl enable getty@tty1

# ── 10. Done ──────────────────────────────────────────────────────
echo "[10/10] Done."
echo ""
echo "=== Setup complete! ==="
echo "=== Test kiosk manually first: ~/kiosk.sh ==="
echo "=== Then reboot: sudo reboot ==="
