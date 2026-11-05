#!/usr/bin/env bash
# Builds a signed App Store .ipa with Xcode alone (no EAS): prebuild, archive, export.
# Needs your Apple Developer team signed in to Xcode (Settings > Accounts) and APPLE_TEAM_ID set.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${APPLE_TEAM_ID:?Set APPLE_TEAM_ID (or put it in .env)}"
export APS_ENVIRONMENT=production

npx expo prebuild --platform ios --clean
mkdir -p build

xcodebuild \
  -workspace ios/FreeMathCamp.xcworkspace \
  -scheme FreeMathCamp \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath build/FreeMathCamp.xcarchive \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  archive

cat > build/ExportOptions.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>teamID</key><string>${APPLE_TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>destination</key><string>export</string>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
  -archivePath build/FreeMathCamp.xcarchive \
  -exportOptionsPlist build/ExportOptions.plist \
  -exportPath build \
  -allowProvisioningUpdates

echo "Built build/FreeMathCamp.ipa. Upload it with Transporter, or: pnpm submit:ios"
