#!/usr/bin/env bash
# Captures the raw App Store screens on one simulator, signed in as the local
# screenshot learner, into store/screenshots/raw/<set>/. Then compose them with
# `node store/compose/compose.mjs`.
#
#   store/capture/capture.sh <set: iphone|ipad|duo> <simulator udid> [dark-shots…]
#
# Needs: the API running locally against a seeded database (apps/api/scripts/
# seed-screenshot-learner.ts), the app prebuilt with EXPO_PUBLIC_API_URL pointing
# at it, and SHOTS_PASSWORD in the environment. Names after the udid (e.g.
# "leagues") are retaken in dark mode.
set -euo pipefail
cd "$(dirname "$0")/../.."

SET=${1:?set: iphone, ipad or duo}
UDID=${2:?simulator udid}
shift 2
DARK=("$@")
: "${SHOTS_PASSWORD:?Set SHOTS_PASSWORD to the seeded learner password}"
OUT="$PWD/store/screenshots/raw/$SET"
mkdir -p "$OUT"

export LANG=en_US.UTF-8
GEM_HOME="$(brew --prefix cocoapods)/libexec" ruby store/capture/add-ui-tests.rb

xcrun simctl bootstatus "$UDID" -b >/dev/null
xcrun simctl status_bar "$UDID" override --time "09:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100

run() {
  TEST_RUNNER_SHOTS_DIR="$OUT" TEST_RUNNER_SHOTS_EMAIL="${SHOTS_EMAIL:-shots@freemathcamp.test}" \
  TEST_RUNNER_SHOTS_PASSWORD="$SHOTS_PASSWORD" TEST_RUNNER_SHOTS_LESSON="${SHOTS_LESSON:-Equivalent Fractions}" \
  TEST_RUNNER_SHOTS_PRACTICE="${SHOTS_PRACTICE:-Fractions, Decimals & Percents}" TEST_RUNNER_SHOTS_TOUR="${SHOTS_TOUR:-}" \
  xcodebuild test -workspace ios/FreeMathCamp.xcworkspace -scheme ShotsUITests -configuration Release \
    -destination "id=$UDID" -derivedDataPath build/dd CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= "$@" > "build/capture-$SET.log" 2>&1 \
    || { tail -40 "build/capture-$SET.log"; exit 1; }
}

xcrun simctl ui "$UDID" appearance light
# SHOTS_ONLY="testLesson testPractice" retakes just those screens.
only=()
for t in ${SHOTS_ONLY:-}; do only+=("-only-testing:ShotsUITests/ShotsUITests/$t"); done
run ${only[@]+"${only[@]}"}
if [ ${#DARK[@]} -gt 0 ]; then
  xcrun simctl ui "$UDID" appearance dark
  only=()
  for name in "${DARK[@]}"; do only+=("-only-testing:ShotsUITests/ShotsUITests/test$(echo "${name:0:1}" | tr a-z A-Z)${name:1}"); done
  run "${only[@]}"
  xcrun simctl ui "$UDID" appearance light
fi
ls -1 "$OUT"
