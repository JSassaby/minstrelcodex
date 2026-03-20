# Minstrel Codex — Raspberry Pi Edition

A standalone writing device that boots directly into Minstrel Codex.

## Hardware
- Raspberry Pi 500 (recommended) or Pi 4/5
- SSD via USB (recommended over SD card for reliability)
- Any HDMI display

## Quick Setup

### 1. Flash the OS
Flash **Raspberry Pi OS Lite (64-bit)** to your SSD using Raspberry Pi Imager.
In Imager's advanced settings:
- Set hostname: `minstrel`
- Enable SSH
- Set username/password
- Configure WiFi

### 2. First Boot
SSH into the Pi, then run:
```bash
git clone -b pi https://github.com/JSassaby/minstrelcodex.git ~/minstrelcodex
cd ~/minstrelcodex
chmod +x pi/scripts/setup.sh
sudo pi/scripts/setup.sh
```

### 3. Reboot
```bash
sudo reboot
```
The Pi will boot directly into Minstrel Codex.

## How It Works
- A lightweight static file server (serve) serves the pre-built app on port 3000
- Chromium launches in kiosk mode pointing at http://localhost:3000
- Both services are managed by systemd and start automatically on boot
- X11 with openbox provides the minimal display environment

## Updating
To pull the latest version:
```bash
cd ~/minstrelcodex
git pull origin pi
npm run build:pi
sudo systemctl restart minstrel-server
```

## Troubleshooting
- Logs: `journalctl -u minstrel-server` and `journalctl -u minstrel-kiosk`
- Restart services: `sudo systemctl restart minstrel-server minstrel-kiosk`
- Force rebuild: `cd ~/minstrelcodex && npm run build:pi`
