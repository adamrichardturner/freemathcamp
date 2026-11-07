# FreeMathCamp for iOS

The FreeMathCamp app, built with Expo (SDK 58, React Native 0.88, Expo Router). It mirrors the web app: the course map, lessons with typeset maths and interactive visuals, adaptive practice, the daily plan, leagues, progress, notifications and settings. Sign-in works with email and password, **Sign in with Apple** and **Google**.

App Store Connect name **FreeMathCamp**, bundle id **`com.freemathcamp.app`**.

## How it fits together

| Piece | How |
| --- | --- |
| Screens | Native, with Expo Router: native tabs (Learn, Course, Leagues, Progress, Settings), large-title stacks, form sheets, SF Symbols, haptics, SwiftUI segmented controls and Swift Charts through `@expo/ui` |
| Look | The web's design tokens (`src/lib/theme.ts`, converted from `apps/web/src/app/globals.css`), Geist and Instrument Serif, light and dark |
| Lessons, articles and problems | Expo DOM components (`src/dom`) render them in a web view with KaTeX, reusing the web app's own visual components (number lines, Mafs explorers, step-throughs) so they look the same as on the site. Metro maps `@fmc/web/…` to `apps/web/src` (see `metro.config.js`) |
| Curriculum | `@fmc/curriculum`, shared with the web and API. Problems are regenerated from their seed on the device; the API marks every answer |
| API | `https://api.freemathcamp.app` directly, with a bearer token kept in the iOS keychain. The app sends `x-fmc-client: ios`, which the API requires for origin-less writes |
| Sign-in | Apple (`expo-apple-authentication`) and Google (`@react-native-google-signin/google-signin`) on the device; the API verifies the ID token against the provider's keys (`POST /api/auth/apple`, `POST /api/auth/google/id-token`) |
| Push | APNs directly: the app registers its device token with `POST /api/me/push/subscriptions` (see `docs/notifications.md`) |

## Run it locally

You need Xcode (with an iOS simulator), Node 22+, pnpm 10 and CocoaPods.

```bash
pnpm install
cp apps/mobile/.env.example apps/mobile/.env   # then fill it in
pnpm dev:api                                   # the API on :4100, from the repo root
```

Then, in another terminal:

```bash
pnpm --filter @fmc/mobile ios
```

`ios` generates the native project (`ios/` is git-ignored and rebuilt from `app.config.ts`), builds a development build and opens it in the simulator. After that, `pnpm dev:mobile` starts Metro on its own for JavaScript changes; rebuild with `ios` after adding a native module or changing `app.config.ts`.

If CocoaPods fails with an encoding error, add `export LANG=en_US.UTF-8` to your shell profile.

## Scripts

Run them in `apps/mobile` with `pnpm <script>` (or from the root with `pnpm --filter @fmc/mobile <script>`).

| Script | What it does |
| --- | --- |
| `start` | Metro for the development build |
| `ios` | Build and run a development build in the simulator |
| `ios:device` | The same, on a plugged-in iPhone (pick your team in Xcode once) |
| `ios:release` | A Release build in the simulator, to check performance |
| `prebuild` | Regenerate `ios/` from `app.config.ts` |
| `typecheck` | TypeScript |
| `doctor` | `expo-doctor`: checks dependency versions and config |
| `katex-css` | Regenerate `src/dom/katex.generated.css` (KaTeX's styles with fonts inlined) after upgrading KaTeX |
| `build:ios:sim` | Local EAS build of a simulator app (`build/FreeMathCamp-sim.tar.gz`) |
| `build:ios:dev` | Local EAS development build for registered devices |
| `build:ios:preview` | Local EAS ad-hoc build to share with testers' registered devices |
| `build:ios` | Local EAS **App Store** build: `build/FreeMathCamp.ipa` |
| `build:ios:cloud` | The same App Store build on EAS's servers |
| `submit:ios` | Upload `build/FreeMathCamp.ipa` to App Store Connect |
| `release:ios` | `build:ios` then `submit:ios` |
| `archive:ios` | An App Store `.ipa` with Xcode alone (no EAS), via `scripts/archive-ios.sh` |
| `store:push` | Upload the App Store listing (text, screenshots, age rating, review notes) from `store.config.json` |

The local `build:*` scripts compile on your Mac, so they're free; EAS only manages signing credentials. They need an Expo account (`npx eas-cli@latest login`); the scripts run EAS CLI through `npx`, so nothing is installed globally.

## Before the first release: one-time setup

### 1. Apple Developer

In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list):

1. **Identifier** `com.freemathcamp.app` (App IDs → App). Enable **Sign in with Apple** and **Push Notifications**. (EAS creates this for you on the first build if it doesn't exist, but it needs the two capabilities.)
2. **Key** for push and Sign in with Apple: Keys → + → enable both *Apple Push Notifications service (APNs)* and *Sign in with Apple* (configure it with the App ID above). Download the `.p8` once. EAS makes its own push key for builds, but it can't be downloaded, so the API needs this one. On the VPS, set from it:
   - `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID=com.freemathcamp.app`, `APNS_PRIVATE_KEY` and `APNS_PRODUCTION=true`, so the API can send pushes;
   - `APPLE_KEY_ID`, `APPLE_TEAM_ID` and `APPLE_PRIVATE_KEY` (the same values), so deleting an account revokes its Apple tokens.

   The private keys are the `.p8` file's contents with newlines written as `\n`.
3. Note your **Team ID** (Membership details) for `APPLE_TEAM_ID`.

### 2. Google sign-in

The app reuses the web app's OAuth client for the server side: it names that client (`GOOGLE_CLIENT_ID`, already set on the API) as its server client, so Google issues the app's ID tokens to it and the API verifies them with no new setting. Its id is public, and is already in `eas.json` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

Google's iOS SDK still needs an **iOS** OAuth client to run the sign-in on the phone; a web client can't stand in for it. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), in the same project as the web client:

1. **Create credentials → OAuth client ID → iOS**, bundle id `com.freemathcamp.app` (no secret is issued, or needed).
2. Put its client id (`…apps.googleusercontent.com`) in `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`: in `apps/mobile/.env` for local builds, and as an EAS environment variable for cloud builds (`npx eas-cli@latest env:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value … --environment production --visibility plaintext`).
3. Rebuild the app: the config derives Google's callback URL scheme from the iOS client id.

The OAuth consent screen is shared with the web client, so there's nothing else to configure. `GOOGLE_IOS_CLIENT_ID` on the API is optional, for a build that signs in without naming the web client.

### 3. The API

Deploy this branch's API changes first: bearer sessions for the app, and the Apple and Google ID-token endpoints. `APPLE_BUNDLE_ID` defaults to `com.freemathcamp.app` and Google reuses `GOOGLE_CLIENT_ID`, so no new settings are needed. Nothing else changes for the web app.

### 4. Expo / EAS

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init          # already done: the project is @adamrichardturner/freemathcamp (id in app.config.ts)
```

### 5. App Store Connect

In [App Store Connect → Apps](https://appstoreconnect.apple.com/apps), the app **FreeMathCamp** with bundle id `com.freemathcamp.app` already exists. Its Apple ID, `6829382170`, is in `eas.json` → `submit.production.ios.ascAppId`, and EAS holds an App Store Connect API key for submitting, so `pnpm submit:ios` needs no Apple sign-in.

## The App Store listing

The listing lives in the repo and is uploaded with EAS Metadata, using the App Store Connect key EAS already holds:

- `store.config.json`: name, subtitle, promotional text, description and keywords (en-GB and en-US), URLs, categories, age rating, release settings and App Review notes.
- `store/screenshots/iphone` (1320 × 2868, 6.9") and `store/screenshots/ipad` (2064 × 2752, 13").
- `store.config.js` adds the App Review demo account from the environment, so the password never lands in git.

The demo account is a normal account on production with a confirmed email. Its details are in the server's `.env` (`APP_REVIEW_EMAIL`, `APP_REVIEW_PASSWORD`). To upload the listing:

```bash
cd apps/mobile
eval "$(ssh freemathcamp 'grep -E "^APP_REVIEW_(EMAIL|PASSWORD)=" /var/www/freemathcamp/.env' | sed 's/^/export /')"
APP_REVIEW_PHONE="+44 …" pnpm store:push
```

`APP_REVIEW_PHONE` is the number App Review can call; Apple won't save the review details without it. Without it, the push asks whether to continue and uploads everything else.

App Privacy, pricing and availability, and the content rights question aren't part of the API EAS uses, so they're set once in App Store Connect (see the checklist below).

## Ship a build to App Store Connect

```bash
cd apps/mobile
pnpm build:ios        # signs with your distribution certificate; the first run asks to sign in to Apple and creates it
pnpm submit:ios       # uploads build/FreeMathCamp.ipa
```

or both at once with `pnpm release:ios`. The first submission asks how to authenticate: let EAS create an **App Store Connect API key** for you, which it then reuses.

The build number goes up by one each build (`autoIncrement`, tracked by EAS). Bump `version` in `app.config.ts` for each new App Store version (1.0.0 → 1.0.1 …).

Without EAS: `APPLE_TEAM_ID=… pnpm archive:ios`, then upload `build/FreeMathCamp.ipa` with Apple's **Transporter** app, or open `build/FreeMathCamp.xcarchive` in Xcode's Organizer and choose *Distribute App*.

Processing takes 5–30 minutes; the build then appears under **TestFlight**.

### TestFlight

1. TestFlight → the build → answer the export compliance question (the app declares no non-exempt encryption, so it's usually pre-answered).
2. **Internal testing**: add yourself and team members; they install through the TestFlight app straight away.
3. **External testing** needs a short beta review the first time.

### App Review checklist

On the app's version page in App Store Connect:

- **Screenshots**: 6.9" iPhone (1320 × 2868) are required; 13" iPad too, since the app supports iPad. Take them in the iPhone 17 Pro Max and iPad Pro 13" simulators (⌘S saves one).
- **Description, keywords, support URL** (`https://freemathcamp.app`), **privacy policy URL** (`https://freemathcamp.app/privacy`).
- **App Privacy** (App Store Connect → App Privacy → Get Started), answering *Yes, we collect data*:
  - **Contact Info → Name** and **Email Address**: App Functionality; linked to the user; not used for tracking.
  - **User Content → Other User Content** (answers to practice problems): App Functionality; linked; not tracking.
  - **Usage Data → Product Interaction** (lessons, practice history, time learning): App Functionality and Analytics; linked; not tracking.
  - **Identifiers → User ID** (account id, Apple/Google sign-in ids) and **Device ID** (push token): App Functionality; linked; not tracking.
  - Nothing else: no location, contacts, health, financial, browsing or diagnostics data, and no tracking.
- **Pricing and Availability**: Free (price tier 0), all countries or the ones you choose.
- **App Information → Content Rights**: *No, it does not contain, show, or access third-party content.*
- **Age Rating** (App Information → Age Rating → Edit): answer *None* / *No* to every question, including the newer ones (social media, messaging, user-generated content, advertising, age assurance, parental controls, health topics). The result is 4+. EAS can't upload this yet because it doesn't send Apple's new social-media question.
- **App Review contact**: your phone number (or set `APP_REVIEW_PHONE` and run `pnpm store:push`).
- **Age rating**: 4+. **Category**: Education.
- **Sign-in for review**: give App Review a demo account with a confirmed email (Settings → Account), since practice needs one.
- The app offers Sign in with Apple alongside Google (guideline 4.8) and account deletion in Settings → Your data (guideline 5.1.1(v)). Deleting an account revokes its Sign in with Apple tokens once the `APPLE_*` key is set on the API.

Then **Add for Review → Submit**. When it's approved, release it by hand or automatically.

## Updating

- JavaScript-only changes still need a new build and review for the App Store. (EAS Update can ship them over the air later; it isn't set up yet.)
- Native changes (`app.config.ts`, new native modules) need `pnpm prebuild` or `pnpm ios` locally, and a new build.
