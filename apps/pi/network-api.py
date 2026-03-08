#!/usr/bin/env python3
"""
Minstrel Codex Network API
Runs on the Pi and exposes Wi-Fi / Bluetooth / system controls to the
Chromium kiosk on localhost:3001.

Requirements: flask flask-cors
Install:      pip3 install flask flask-cors
"""

import subprocess
import json
import signal
import sys

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])


# ── Helpers ──────────────────────────────────────────────────────────

def run(cmd: list[str], timeout: int = 10) -> tuple[int, str, str]:
    """Run a shell command and return (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except subprocess.TimeoutExpired:
        return 1, "", "timeout"
    except Exception as e:
        return 1, "", str(e)


def get_wifi_status() -> dict:
    code, out, _ = run(["nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL,SECURITY",
                        "device", "wifi", "list"])
    connected = False
    ssid = ""
    signal = 0
    if code == 0:
        for line in out.splitlines():
            parts = line.split(":")
            if len(parts) >= 4 and parts[0] == "yes":
                connected = True
                ssid = parts[1]
                try:
                    signal = int(parts[2])
                except ValueError:
                    signal = 0
                break
    return {"connected": connected, "ssid": ssid, "signal": signal}


def get_bluetooth_status() -> dict:
    code, out, _ = run(["rfkill", "list", "bluetooth"])
    enabled = code == 0 and "Soft blocked: no" in out
    return {"enabled": enabled}


# ── Routes ───────────────────────────────────────────────────────────

@app.get("/status")
def status():
    return jsonify({
        "wifi": get_wifi_status(),
        "bluetooth": get_bluetooth_status(),
    })


@app.get("/wifi/scan")
def wifi_scan():
    # Trigger a fresh scan then list results
    run(["nmcli", "device", "wifi", "rescan"])
    code, out, _ = run(["nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY",
                        "device", "wifi", "list"])
    networks = []
    seen: set[str] = set()
    if code == 0:
        for line in out.splitlines():
            # nmcli escapes colons with backslash — split carefully
            parts = line.split(":")
            if len(parts) < 3:
                continue
            ssid = parts[0].strip()
            if not ssid or ssid in seen:
                continue
            seen.add(ssid)
            try:
                signal_pct = int(parts[1])
            except ValueError:
                signal_pct = 0
            # Convert 0-100 % to rough dBm (-100 to -30)
            dbm = -100 + signal_pct * 70 // 100
            security = parts[2].strip()
            secured = bool(security and security != "--")
            networks.append({
                "ssid": ssid,
                "signal": dbm,
                "secured": secured,
            })
    # Sort strongest first
    networks.sort(key=lambda n: n["signal"], reverse=True)
    return jsonify(networks)


@app.post("/wifi/connect")
def wifi_connect():
    body = request.get_json(silent=True) or {}
    ssid = body.get("ssid", "").strip()
    password = body.get("password", "").strip()

    if not ssid:
        return jsonify({"success": False, "error": "SSID required"}), 400

    if password:
        code, _, err = run(
            ["nmcli", "device", "wifi", "connect", ssid, "password", password],
            timeout=20,
        )
    else:
        code, _, err = run(
            ["nmcli", "device", "wifi", "connect", ssid],
            timeout=20,
        )

    if code == 0:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": err or "Connection failed"})


@app.post("/wifi/disconnect")
def wifi_disconnect():
    code, _, err = run(["nmcli", "device", "disconnect", "wlan0"])
    return jsonify({"success": code == 0, "error": err if code != 0 else None})


@app.post("/bluetooth/toggle")
def bluetooth_toggle():
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get("enabled", False))
    action = "unblock" if enabled else "block"
    code, _, err = run(["rfkill", action, "bluetooth"])
    return jsonify({"success": code == 0, "error": err if code != 0 else None})


@app.post("/system/exit-kiosk")
def exit_kiosk():
    # Kill chromium and labwc gracefully; systemd will restart if configured
    run(["pkill", "-f", "chromium"])
    run(["pkill", "labwc"])
    return jsonify({"success": True})


# ── Entry point ───────────────────────────────────────────────────────

def shutdown(sig, frame):
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    app.run(host="127.0.0.1", port=3001, debug=False)
