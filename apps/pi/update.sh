#!/usr/bin/env bash
# update.sh — Update Minstrel Codex from a USB drive
# Run as: sudo bash update.sh
# The USB drive must contain the new dist/ contents at its root (index.html visible).

set -e

USER=pi_experiments
APP_DIR="/home/$USER/minstrel-codex"

echo "=== Minstrel Codex Pi Kiosk Update ==="

# ── Find USB drive ────────────────────────────────────────────────
echo "[1/3] Looking for USB drive..."
USB_MOUNT=""
for dir in /media/usb*; do
  if [ -d "$dir" ] && [ -f "$dir/index.html" ]; then
    USB_MOUNT="$dir"
    break
  fi
done

if [ -z "$USB_MOUNT" ]; then
  echo "ERROR: No USB drive found with index.html. Plug in the USB drive and try again."
  exit 1
fi

echo "Found update at: $USB_MOUNT"

# ── Copy new files ────────────────────────────────────────────────
echo "[2/3] Copying updated app files..."
rsync -a --delete "$USB_MOUNT/" "$APP_DIR/"
chown -R "$USER:$USER" "$APP_DIR"

# ── Restart server ────────────────────────────────────────────────
echo "[3/3] Restarting server..."
systemctl restart minstrel-codex

echo ""
echo "=== Update complete ==="
echo "The kiosk will reload automatically within a few seconds."
echo "If it does not, reboot: sudo reboot"
