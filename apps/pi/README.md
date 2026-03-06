# Minstrel Codex — Pi Setup

## What you need
- Raspberry Pi 5
- SD card with Pi OS Lite (64-bit) installed
- USB drive with the minstrelapp/ folder copied to it
- Keyboard and monitor plugged into the Pi

---

## Step 1 — Copy the app to the Pi

Plug your USB drive into the Pi.
Then type this and press Enter:

```bash
mkdir -p ~/minstrelapp && cp -r /media/pi_experiments/*/dist/* ~/minstrelapp/
```

---

## Step 2 — Run setup (takes about 10 minutes)

Type this and press Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/JSassaby/minstrelcodex/main/apps/pi/setup.sh | bash
```

Wait for it to finish. You'll see a message that says **"✓ Minstrel Codex is ready!"** when it's done.

---

## Step 3 — Test it

Before rebooting, make sure everything works by typing:

```bash
~/kiosk.sh
```

The app should open in fullscreen. Press **Alt+F4** to close it and go back to the terminal.

---

## Step 4 — Reboot

Once you're happy it works, type:

```bash
sudo reboot
```

The Pi will restart and boot straight into the app. You're done!

---

## Updating the app

When you have a new version, copy the new files to the Pi the same way as Step 1 — just plug in the USB drive and run the same copy command. No need to run setup again.

If the app doesn't update on screen, reboot the Pi:

```bash
sudo reboot
```

---

## Something went wrong?

**The app didn't open after reboot**
Try running `~/kiosk.sh` from the terminal to see any error messages.

**The copy command in Step 1 didn't work**
Your USB drive might be mounted at a different path. Run `ls /media/pi_experiments/` to see what's there, then adjust the path.

**You need to get back to the terminal**
SSH into the Pi from another computer: `ssh pi_experiments@<Pi's IP address>`
To find the IP, plug in a keyboard and type `hostname -I`.
