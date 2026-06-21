#!/usr/bin/env bash
# Deploy: build + zip both browsers, then upload via API if creds are in .env,
# else open the store tab for manual drag-and-drop. Zero-config fallback.
#
# Creds (all optional — deploy degrades to opening tabs without them):
#   .env:  WEB_EXT_API_KEY / WEB_EXT_API_SECRET (Firefox)
#          CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN / EXTENSION_ID (Chrome)
# See .env.example for how to obtain each.
set -euo pipefail
cd "$(dirname "$0")/.."
# ponytail: shell-sourced .env; fine for KEY=VALUE, breaks on values with spaces
# — none of our creds have spaces. Switch to dotenv-cli if that ever changes.
[ -f .env ] && set -a && . ./.env && set +a || true

VERSION=$(node -p "require('./package.json').version")

echo "🔨  Building + zipping both browsers..."
pnpm build > /dev/null
pnpm build:firefox > /dev/null
pnpm exec wxt zip > /dev/null
pnpm exec wxt zip -b firefox > /dev/null

CHROME_ZIP=$(ls -1t dist/*-chrome.zip 2>/dev/null | head -1)
FF_DIR="dist/firefox-mv2"
FF_SOURCES_ZIP=$(ls -1t dist/*-sources.zip 2>/dev/null | head -1)

echo "📦  Chrome zip:   ${CHROME_ZIP:-<none>}"
echo "📦  Firefox dir:  $FF_DIR"
[ -n "$FF_SOURCES_ZIP" ] && echo "📦  AMO sources:  $FF_SOURCES_ZIP"

# ── Chrome Web Store ─────────────────────────────────────────
echo ""
if [ -n "${CLIENT_ID:-}" ] && [ -n "${CLIENT_SECRET:-}" ] && [ -n "${REFRESH_TOKEN:-}" ] && [ -n "${EXTENSION_ID:-}" ]; then
  echo "📤  Uploading to Chrome Web Store (extension $EXTENSION_ID)..."
  pnpm exec chrome-webstore-upload --source "$CHROME_ZIP" --extension-id "$EXTENSION_ID" \
    || echo "⚠️  Chrome upload failed — check creds / extension ID"
else
  echo "🌐  Chrome creds incomplete in .env → opening Web Store tab (manual upload)..."
  open "https://chrome.google.com/webstore/devconsole/" 2>/dev/null || true
  [ -n "$CHROME_ZIP" ] && echo "    Drag: $CHROME_ZIP"
fi

# ── Firefox AMO ──────────────────────────────────────────────
echo ""
if [ -n "${WEB_EXT_API_KEY:-}" ] && [ -n "${WEB_EXT_API_SECRET:-}" ]; then
  echo "📤  Signing + submitting to AMO (channel: ${WEB_EXT_CHANNEL:-listed})..."
  SIGN_ARGS=(--source-dir "$FF_DIR" --channel "${WEB_EXT_CHANNEL:-listed}"
    --api-key "$WEB_EXT_API_KEY" --api-secret "$WEB_EXT_API_SECRET" --artifacts-dir dist)
  # ponytail: AMO requires sources when the shipped code is bundled/minified.
  # WXT emits dist/*-sources.zip; pass it if present.
  [ -n "$FF_SOURCES_ZIP" ] && SIGN_ARGS+=(--upload-source-code "$FF_SOURCES_ZIP")
  # AMO listed submissions require license + categories metadata
  METADATA_FILE="$(dirname "$0")/../.amo-metadata.json"
  [ -f "$METADATA_FILE" ] && SIGN_ARGS+=(--amo-metadata "$METADATA_FILE")
  pnpm exec web-ext sign "${SIGN_ARGS[@]}" \
    || echo "⚠️  AMO sign failed — check API key/secret"
else
  echo "🌐  AMO creds incomplete in .env → opening AMO tab (manual upload)..."
  open "https://addons.mozilla.org/developers/" 2>/dev/null || true
  echo "    Drag: dist/*-firefox.zip  (sources zip only needed for reviewed submissions)"
fi

echo ""
echo "✅  Deploy complete."
