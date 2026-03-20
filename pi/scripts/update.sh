#!/bin/bash
set -e
echo "=== Updating Minstrel Codex ==="
cd "$(dirname "$0")/../.."
git pull origin pi
npm install
npm run build:pi
sudo systemctl restart minstrel-server
echo "=== Update complete. Minstrel Codex restarted. ==="
