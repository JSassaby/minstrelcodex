#!/usr/bin/env bash
# Minstrel Codex Pi Kiosk Setup
# Run with: curl -fsSL https://raw.githubusercontent.com/JSassaby/minstrelcodex/main/apps/pi/setup.sh | bash
set -e

# ── Step 1: Packages ──────────────────────────────────────────────
echo "📦 Installing packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq --no-install-recommends \
  chromium labwc unclutter curl python3 python3-pip
pip3 install --quiet flask flask-cors

# ── Step 2: Node.js 20 + serve ────────────────────────────────────
echo "⬢  Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

nvm install 20 --silent
nvm use 20
npm install -g serve --silent

sudo cp $(echo ~/.nvm/versions/node/v20*/bin/serve) /usr/local/bin/serve

# ── Step 3: kiosk.sh ─────────────────────────────────────────────
echo "🖥️  Setting up kiosk..."
cat > ~/kiosk.sh << 'EOF'
#!/bin/bash
/usr/local/bin/serve -s /home/pi_experiments/minstrelapp -l 3000 &
SERVER_PID=$!
for i in $(seq 1 30); do
  curl -s http://localhost:3000 > /dev/null 2>&1 && break
  sleep 1
done
chromium --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-restore-session-state \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --app=http://localhost:3000
kill $SERVER_PID
EOF
chmod +x ~/kiosk.sh

# ── Step 4: labwc autostart ───────────────────────────────────────
mkdir -p ~/.config/labwc
echo '/home/pi_experiments/kiosk.sh &' > ~/.config/labwc/autostart

# ── Step 5: Autologin ─────────────────────────────────────────────
echo "🔐 Configuring autologin..."
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'CONF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi_experiments --noclear %I $TERM
CONF
sudo systemctl daemon-reload

# ── Step 6: labwc on login ────────────────────────────────────────
grep -qxF 'exec labwc' ~/.profile 2>/dev/null || \
cat >> ~/.profile << 'PROF'
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec labwc
fi
PROF

# ── Step 7: Network API service ───────────────────────────────────
echo "🌐 Installing network API service..."
cp "$(dirname "$0")/network-api.py" ~/network-api.py 2>/dev/null || \
  curl -fsSL https://raw.githubusercontent.com/JSassaby/minstrelcodex/main/apps/pi/network-api.py \
    -o ~/network-api.py
sudo cp "$(dirname "$0")/minstrel-network.service" \
  /etc/systemd/system/minstrel-network.service 2>/dev/null || \
  curl -fsSL https://raw.githubusercontent.com/JSassaby/minstrelcodex/main/apps/pi/minstrel-network.service \
    -o /tmp/minstrel-network.service && \
  sudo mv /tmp/minstrel-network.service /etc/systemd/system/minstrel-network.service
sudo systemctl daemon-reload
sudo systemctl enable minstrel-network
sudo systemctl start minstrel-network

# ── Step 8: Verify serve ──────────────────────────────────────────
/usr/local/bin/serve -s /home/pi_experiments/minstrelapp -l 3001 &
TEST_PID=$!
sleep 2
if curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo "✓ Server test passed"
else
  echo "✗ WARNING: Server test failed - check minstrelapp folder"
fi
kill $TEST_PID 2>/dev/null

# ── Step 9: Done ──────────────────────────────────────────────────
echo "✅ All done!"
echo ""
echo "✓ Minstrel Codex is ready!"
echo ""
echo "Test now:   ~/kiosk.sh"
echo "Or reboot:  sudo reboot"
echo ""
