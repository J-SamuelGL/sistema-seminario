#!/usr/bin/env bash
set -euo pipefail

PISTON_URL="${1:?Usage: install-piston-languages.sh <piston-url>}"

for pkg in '{"language":"python","version":"3.10.0"}' '{"language":"javascript","version":"18.15.0"}'; do
  curl -sf -X POST "$PISTON_URL/api/v2/packages" -H "Content-Type: application/json" -d "$pkg"
done
