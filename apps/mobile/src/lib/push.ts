import * as Notifications from "expo-notifications";
import { api } from "./api";

/**
 * APNs for the iOS app. The API sends pushes straight to Apple with its .p8 key
 * (docs/notifications.md), so the app registers the raw device token rather
 * than an Expo push token.
 */
Notifications.setNotificationHandler({
  // In the foreground the in-app centre shows it; just keep the badge right.
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

let registered: string | null = null;

export const pushPermission = async () => (await Notifications.getPermissionsAsync()).status;

/** Asks once (if `ask`), then sends this device's token to the API. Safe to call on every launch. */
export async function registerPush({ ask }: { ask: boolean }) {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) status = (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } })).status;
  if (status !== "granted") return false;
  const { data } = await Notifications.getDevicePushTokenAsync();
  const token = String(data).toLowerCase();
  if (registered !== token) {
    await api.post("/me/push/subscriptions", { platform: "ios", token });
    registered = token;
  }
  return true;
}

/** Stops pushes to this device, on sign-out or when the learner turns them off. */
export async function unregisterPush() {
  let token = registered;
  if (!token && (await pushPermission()) === "granted") token = String((await Notifications.getDevicePushTokenAsync()).data).toLowerCase();
  registered = null;
  if (token) await api.delete("/me/push/subscriptions", { token });
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

/** iOS can hand out a new token at any time; keep the API's copy current. */
export const watchPushToken = () =>
  Notifications.addPushTokenListener(({ data }) => {
    const token = String(data).toLowerCase();
    if (registered && registered !== token) void api.post("/me/push/subscriptions", { platform: "ios", token }).then(() => (registered = token));
  });

export const setBadge = (n: number) => Notifications.setBadgeCountAsync(n).catch(() => {});

/** Custom keys sit at the top level of the APNs payload: id, kind, category, href. */
export const pushData = (r: Notifications.NotificationResponse) => r.notification.request.content.data as { id?: string; href?: string | null };
