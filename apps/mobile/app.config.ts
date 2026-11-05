import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * FreeMathCamp for iOS. Values that differ per machine or per release come from
 * the environment (see .env.example), so the same config serves local builds,
 * EAS builds and CI.
 */
const BUNDLE_ID = "com.freemathcamp.app";
/** The EAS project (expo.dev/@adamrichardturner/freemathcamp). */
const EAS_PROJECT_ID = "fda6a835-737f-4b26-a6bc-91e22d028fed";

/** The iOS OAuth client from Google Cloud, e.g. 1234-abc.apps.googleusercontent.com. */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
/** Google calls back into the app on the reversed client id. */
const googleUrlScheme = googleIosClientId?.split(".").reverse().join(".");

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "FreeMathCamp",
  slug: "freemathcamp",
  owner: "adamrichardturner",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "freemathcamp",
  userInterfaceStyle: "automatic",
  backgroundColor: "#fbfcff",
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: true,
    usesAppleSignIn: true,
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      CFBundleDisplayName: "FreeMathCamp",
      UIBackgroundModes: ["remote-notification"],
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        // UserDefaults: React Native and Expo modules keep small settings there.
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults", NSPrivacyAccessedAPITypeReasons: ["CA92.1"] },
      ],
    },
  },
  android: {
    package: BUNDLE_ID,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 120,
        resizeMode: "contain",
        backgroundColor: "#5b4be0",
        dark: { image: "./assets/images/splash-icon.png", backgroundColor: "#0a0b15" },
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./node_modules/@expo-google-fonts/geist/400Regular/Geist_400Regular.ttf",
          "./node_modules/@expo-google-fonts/geist/500Medium/Geist_500Medium.ttf",
          "./node_modules/@expo-google-fonts/geist/600SemiBold/Geist_600SemiBold.ttf",
          "./node_modules/@expo-google-fonts/geist/700Bold/Geist_700Bold.ttf",
          "./node_modules/@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf",
          "./node_modules/@expo-google-fonts/instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf",
        ],
      },
    ],
    "expo-secure-store",
    "expo-apple-authentication",
    ...(googleUrlScheme ? [["@react-native-google-signin/google-signin", { iosUrlScheme: googleUrlScheme }] as [string, unknown]] : []),
    ["expo-notifications", { mode: process.env.APS_ENVIRONMENT === "development" ? "development" : "production" }],
    ["expo-audio", { microphonePermission: false, enableBackgroundPlayback: false }],
    "expo-localization",
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: EAS_PROJECT_ID },
  },
});
