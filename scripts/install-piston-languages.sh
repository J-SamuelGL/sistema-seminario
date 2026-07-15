#!/usr/bin/env bash
set -euo pipefail

PISTON_URL="${1:?Usage: install-piston-languages.sh <piston-url>}"

for pkg in \
  '{"language":"python","version":"3.10.0"}' \
  '{"language":"node","version":"18.15.0"}' \
  '{"language":"java","version":"15.0.2"}' \
  '{"language":"mono","version":"6.12.0"}' \
  '{"language":"php","version":"8.2.3"}'; do
  curl -sf -X POST "$PISTON_URL/api/v2/packages" -H "Content-Type: application/json" -d "$pkg"
done
