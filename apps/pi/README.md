# Minstrel Codex — Raspberry Pi 5 Kiosk

Offline kiosk setup for Raspberry Pi OS Lite (64-bit).
The app runs entirely locally — no internet required after setup.

---

## Hardware

- Raspberry Pi 5
- MicroSD card (16 GB+)
- USB drive (for transferring builds)
- HDMI display + keyboard (for initial setup only)

---

## Initial Pi OS Configuration

Flash **Raspberry Pi OS Lite (64-bit)** to the SD card using Raspberry Pi Imager.

Before first boot, use the Imager's "Advanced options" (gear icon) to set:
- **Username**: `pi_experiments`
- **Password**: *(your choice)*
- **SSH**: enabled (optional, useful for remote setup)
- **Locale / timezone**: as appropriate

Boot and log in as `pi_experiments`.

---

## Step 1 — One-time system setup

Run `setup.sh` once on the Pi. This installs X, Openbox, Chromium, nvm, Node 20, and `serve`.

```bash
sudo bash apps/pi/setup.sh
```

> You can transfer `apps/pi/` to the Pi via USB or SCP.

---

## Step 2 — Build the app (on your dev machine)

```bash
npm run build:pi
```

This builds `apps/web` and prints a reminder to copy `apps/web/dist/` to the USB drive.

Copy the **contents** of `apps/web/dist/` to the **root** of a USB drive
(so `index.html` is at the drive root, not inside a `dist/` subfolder).

---

## Step 3 — Install on the Pi

Plug the USB drive into the Pi, then:

```bash
sudo bash apps/pi/install.sh
```

This will:
1. Detect the USB drive (looks for `index.html` under `/media/usb*`)
2. Copy the app to `/home/pi_experiments/minstrel-codex/`
3. Install and enable a `systemd` service that serves the app on port 3000
4. Configure autologin on tty1
5. Configure `.bash_profile` to run `startx` on tty1
6. Configure Openbox to launch Chromium in kiosk mode at `http://localhost:3000`

Reboot to start the kiosk:

```bash
sudo reboot
```

---

## Updating the app

Build a new version on your dev machine:

```bash
npm run build:pi
```

Copy `apps/web/dist/` contents to a USB drive root, plug it into the Pi, then:

```bash
sudo bash apps/pi/update.sh
```

The service restarts automatically. If the browser does not refresh, reboot: `sudo reboot`

---

## Connecting to the Pi

The Pi has no hostname configured. Find its IP address:

- Check your router's DHCP client list, **or**
- On the Pi: `hostname -I`

SSH (if enabled): `ssh pi_experiments@<IP>`

---

## Services

| Service | Description |
|---|---|
| `minstrel-codex` | Serves the app on `http://localhost:3000` |

```bash
sudo systemctl status minstrel-codex
sudo journalctl -u minstrel-codex -f
sudo systemctl restart minstrel-codex
```

---

## Troubleshooting

**Blank screen after boot**
Check autologin and `.bash_profile`:
```bash
cat /etc/systemd/system/getty@tty1.service.d/autologin.conf
cat ~/.bash_profile
```

**Chromium shows "connection refused"**
```bash
sudo systemctl status minstrel-codex
```

**USB drive not detected**
`usbmount` mounts drives to `/media/usb0`, `/media/usb1`, etc. Verify:
```bash
ls /media/
```

**Exit kiosk**
Press `Alt+F4` to close Chromium, or SSH in and run `sudo systemctl stop minstrel-codex`.
