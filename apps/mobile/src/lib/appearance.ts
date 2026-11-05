import * as SecureStore from "expo-secure-store";

/** Light, dark or follow the system, as in the web app's settings. Kept on the device. */
export type AppearancePref = "system" | "light" | "dark";
const KEY = "fmc.appearance";

export const loadAppearance = async (): Promise<"light" | "dark" | null> => {
  const v = await SecureStore.getItemAsync(KEY).catch(() => null);
  return v === "light" || v === "dark" ? v : null;
};

export const saveAppearance = (pref: AppearancePref) => (pref === "system" ? SecureStore.deleteItemAsync(KEY) : SecureStore.setItemAsync(KEY, pref));
