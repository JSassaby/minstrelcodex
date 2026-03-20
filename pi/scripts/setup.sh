#!/bin/bash
set -e

echo "=== Minstrel Codex Pi Setup ==="
echo "This will take 5-10 minutes. Do not interrupt."

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
  chromium-browser \
  xorg \
  openbox \
  x11-xserver-utils \
  unclutter \
  nodejs \
  npm \
  curl \
  git

# Install Node 20 if not present or too old
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VERSION" -lt "18" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install serve globally for static file serving
npm install -g serve

# Build the app
cd /home/pi/minstrelcodex || cd ~/minstrelcodex
npm install
npm run build:pi

# Get the actual home directory of the pi user
PI_HOME=$(getent passwd pi | cut -d: -f6 2>/dev/null || echo "/home/pi")
PI_USER=$(getent passwd pi &>/dev/null && echo "pi" || echo "$SUDO_USER")

# Install systemd services
cp pi/systemd/minstrel-server.service /etc/systemd/system/
cp pi/systemd/minstrel-kiosk.service /etc/systemd/system/

# Set correct user in service files
sed -i "s/User=pi/User=$PI_USER/g" /etc/systemd/system/minstrel-server.service
sed -i "s/User=pi/User=$PI_USER/g" /etc/systemd/system/minstrel-kiosk.service

# Set the correct working directory
INSTALL_DIR=$(pwd)
sed -i "s|/home/pi/minstrelcodex|$INSTALL_DIR|g" /etc/systemd/system/minstrel-server.service
sed -i "s|/home/pi/minstrelcodex|$INSTALL_DIR|g" /etc/systemd/system/minstrel-kiosk.service

# Set up auto-login on tty1 for the pi user
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/override.conf << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $PI_USER --noclear %I \$TERM
EOF

# Add startx to .bash_profile if not already there
BASH_PROFILE="$PI_HOME/.bash_profile"
if ! grep -q "startx" "$BASH_PROFILE" 2>/dev/null; then
  cat >> "$BASH_PROFILE" << 'EOF'

# Start X on tty1 login
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  startx -- -nocursor
fi
EOF
fi

# Create .xinitrc to launch openbox and kiosk
cat > "$PI_HOME/.xinitrc" << 'EOF'
#!/bin/sh
xset s off
xset s noblank
xset -dpms
unclutter -idle 0 &
exec openbox-session
EOF

# Create openbox autostart
mkdir -p "$PI_HOME/.config/openbox"
cat > "$PI_HOME/.config/openbox/autostart" << 'EOF'
# Wait for the server to be ready
sleep 4

# Launch Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --noerrdialogs \
  --disable-translate \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  http://localhost:3000 &
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable minstrel-server
systemctl start minstrel-server

echo ""
echo "=== Setup Complete ==="
echo "Reboot the Pi to start Minstrel Codex automatically."
echo "Run: sudo reboot"
