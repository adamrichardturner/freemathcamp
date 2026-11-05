import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { api, type SignedIn } from "./api";

/**
 * Native sign-in with Apple and Google. The device does the provider's flow and
 * hands us an ID token; the API checks it against the provider's keys and signs
 * the learner in, creating or linking the account by its verified email.
 * Each returns null when the learner cancels.
 */
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
/**
 * The web app's OAuth client (the API's GOOGLE_CLIENT_ID). Naming it as the
 * server client makes Google issue the ID token to it, so the API verifies
 * app sign-ins with the client it already has.
 */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const googleConfigured = !!GOOGLE_IOS_CLIENT_ID;

let googleReady = false;

export async function signInWithGoogle(): Promise<SignedIn | null> {
  if (!GOOGLE_IOS_CLIENT_ID) throw new Error("Google sign-in isn't set up in this build.");
  if (!googleReady) {
    GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID, ...(GOOGLE_WEB_CLIENT_ID ? { webClientId: GOOGLE_WEB_CLIENT_ID } : {}), scopes: ["email", "profile"] });
    googleReady = true;
  }
  try {
    const res = await GoogleSignin.signIn();
    if (isCancelledResponse(res)) return null;
    if (!res.data.idToken) throw new Error("Google didn't return an ID token.");
    const signedIn = await api.post<SignedIn>("/auth/google/id-token", { idToken: res.data.idToken });
    // Our own session takes over from here; Google's is only needed to sign in.
    await GoogleSignin.signOut().catch(() => {});
    return signedIn;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return null;
    throw e;
  }
}

export const appleAvailable = () => AppleAuthentication.isAvailableAsync();

export async function signInWithApple(): Promise<SignedIn | null> {
  // Apple puts the hash of this one-time nonce in its token; the API checks it against the raw value.
  const nonce = Crypto.randomUUID() + Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!credential.identityToken) throw new Error("Apple didn't return an identity token.");
    // Apple shares the name only the first time someone signs in to the app.
    const name = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName) : "";
    // The one-time code lets the API keep a refresh token, so deleting the account can revoke Apple access.
    return await api.post<SignedIn>("/auth/apple", {
      identityToken: credential.identityToken,
      nonce,
      ...(name ? { name } : {}),
      ...(credential.authorizationCode ? { authorizationCode: credential.authorizationCode } : {}),
    });
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw e;
  }
}
