#!/usr/bin/env bash
# NR Cafe — update the server to the latest main.
# Run OUTSIDE opening hours: the app stops during the build.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Now running: $(git log --oneline -1)"
git fetch origin
NEW="$(git log --oneline HEAD..origin/main)"
if [ -z "$NEW" ]; then
  echo "Already up to date. Nothing to do."
  exit 0
fi
echo "== New commits:"; echo "$NEW"
echo "== New migrations:"
git diff --name-only HEAD origin/main -- prisma/migrations | grep migration.sql || echo "(none)"

read -rp "Update now? The app will stop for a few minutes. [y/N] " ok
[ "$ok" = "y" ] || { echo "Cancelled."; exit 1; }

git pull --ff-only
npm ci

echo "== Migration status:"
npx prisma migrate status || true
read -rp "Run 'prisma migrate deploy' now? [y/N] " mig
if [ "$mig" = "y" ]; then
  echo "== Backup before migration"
  sudo /usr/local/sbin/nr-cafe-backup
  npx prisma migrate deploy
fi

sudo systemctl stop nr-cafe
npm run build
sudo systemctl start nr-cafe

sleep 5
if curl -sfI http://127.0.0.1:3000 > /dev/null; then
  echo "== OK: $(git log --oneline -1) is running."
else
  echo "!! App did not answer. Check: journalctl -u nr-cafe -n 50"
  exit 1
fi
