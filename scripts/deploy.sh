#!/usr/bin/env bash
# One-command deploy: build + zip both browsers, open both store consoles.
# Zero dependencies beyond WXT. Drag the printed zips into the two store tabs.
#
# ponytail: manual upload, but glued into one command. True API automation
# (web-ext sign + chrome-webstore-upload-cli) is the tracked upgrade — needs
# AMO JWT key/secret + Chrome OAuth refresh token, see README deploy section.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")

echo "🔨  Building Chrome + Firefox..."
pnpm build
pnpm build:firefox

echo ""
echo "📦  Zipping..."
pnpm exec wxt zip > /dev/null
pnpm exec wxt zip -b firefox > /dev/null

echo ""
echo "✅  Zips ready in dist/:"
ls -1 dist/*-chrome.zip dist/*-firefox.zip 2>/dev/null | sed 's/^/    /'

echo ""
echo "🌐  Opening store dev consoles..."
if open "https://chrome.google.com/webstore/devconsole/" 2>/dev/null; then
  echo "    Chrome Web Store → open"
else
  echo "    (open manually: https://chrome.google.com/webstore/devconsole/)"
fi
if open "https://addons.mozilla.org/developers/" 2>/dev/null; then
  echo "    Firefox AMO → open"
else
  echo "    (open manually: https://addons.mozilla.org/developers/)"
fi

echo ""
echo "👉  Chrome:  drag dist/*-chrome.zip into the Web Store tab."
echo "👉  Firefox: drag dist/*-firefox.zip into AMO."
echo "    (dist/*-sources.zip only needed for AMO reviewed/signed submissions.)"
