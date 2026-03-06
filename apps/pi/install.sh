#!/usr/bin/env bash
# install.sh — Install Minstrel Codex from a USB drive and configure kiosk mode
# Run as: sudo bash install.sh
# Assumes setup.sh has already been run.

set -e

USER=pi_experiments
HOME_DIR="/home/$USER"
APP_DIR="$HOME_DIR/minstrel-codex"
PORT=3000

echo "=== Minstrel Codex Pi Kiosk Install ==="

# ── Find USB drive ────────────────────────────────────────────────
echo "[1/5] Looking for USB drive..."
USB_MOUNT=""
for dir in /media/usb*; do
  if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
    USB_MOUNT="$dir"
    break
  fi
done

if [ -z "$USB_MOUNT" ]; then
  echo "ERROR: No USB drive found with index.html. Make sure the drive is mounted under /media/usb*"
  exit 1
fi

echo "Found app at: $USB_MOUNT"

# ── Copy dist ─────────────────────────────────────────────────────
echo "[2/5] Copying app files..."
rsync -a --delete "$USB_MOUNT/" "$APP_DIR/"
chown -R "$USER:$USER" "$APP_DIR"

# ── systemd service ───────────────────────────────────────────────
echo "[3/5] Installing systemd service..."
cat > /etc/systemd/system/minstrel-codex.service << EOF
[Unit]
Description=Minstrel Codex static server
After=network.target

[Service]
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/home/$USER/.nvm/versions/node/\$(ls /home/$USER/.nvm/versions/node | sort -V | tail -1)/bin/serve -s $APP_DIR -l $PORT
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable minstrel-codex
systemctl restart minstrel-codex

# ── Autologin (Pi OS Lite / getty) ───────────────────────────────
echo "[4/5] Configuring autologin..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $USER --noclear %I \$TERM
EOF
systemctl daemon-reload

# ── .bash_profile → startx ────────────────────────────────────────
PROFILE="$HOME_DIR/.bash_profile"
if ! grep -q "startx" "$PROFILE" 2>/dev/null; then
  cat >> "$PROFILE" << 'EOF'

# Auto-start X on tty1
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx
fi
EOF
  chown "$USER:$USER" "$PROFILE"
fi

# ── openbox autostart ─────────────────────────────────────────────
echo "[5/5] Configuring openbox..."
OPENBOX_DIR="$HOME_DIR/.config/openbox"
mkdir -p "$OPENBOX_DIR"
cat > "$OPENBOX_DIR/autostart" << EOF
# Disable screen blanking and power management
xset s off
xset s noblank
xset -dpms

# Hide cursor when idle
unclutter -idle 3 -root &

# Launch Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --no-first-run \
  --disable-features=TranslateUI \
  --app=http://localhost:$PORT &
EOF
chown -R "$USER:$USER" "$OPENBOX_DIR"

echo ""
echo "=== Install complete ==="
echo "Reboot to start the kiosk: sudo reboot"
