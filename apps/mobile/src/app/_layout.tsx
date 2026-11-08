import { QueryClient, QueryClientProvider, focusManager, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { AppState, Appearance, LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "@/components/toaster";
import { markInput, useActivityTracker, useTimezoneSync } from "@/lib/activity";
import { ApiError, api, session, setUnauthorizedHandler, type User } from "@/lib/api";
import { loadAppearance } from "@/lib/appearance";
import { appHref } from "@/lib/links";
import { keys, switchUser, useApplyUser, useNotificationCounts, useSession } from "@/lib/queries";
import { pushData, registerPush, setBadge, watchPushToken } from "@/lib/push";
import { fonts, useTheme } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();
// Expo's DOM wrapper sends props on its first render, before the native web view
// has registered, then again once the page is ready; the first send's failure is harmless.
LogBox.ignoreLogs(["Unable to find the 'DomWebView' view"]);
void loadAppearance().then((scheme) => scheme && Appearance.setColorScheme(scheme));

// Signed out, the welcome screen sits under the sign-in and sign-up sheets.
export const unstable_settings = { anchor: "welcome" };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && count < 2,
    },
  },
});

// React Query refetches when the app returns to the foreground, as the web does on window focus.
AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function App() {
  const { c, scheme } = useTheme();
  const qc = useQueryClient();
  const { user, ready, verified } = useSession();
  const signedIn = !!user;
  const learner = signedIn && verified && !!user.username;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // An expired or revoked session sends the app back to sign-in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void session.set(null).then(() => switchUser(qc, null));
    });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  // Push: register this device once signed in (without asking; the welcome step and Settings ask).
  useEffect(() => {
    if (!learner) return;
    void registerPush({ ask: false }).catch(() => {});
    const sub = watchPushToken();
    return () => sub.remove();
  }, [learner]);

  // Opening a push marks it read and goes where it points.
  useEffect(() => {
    if (!learner) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r) return;
      const { id, href } = pushData(r);
      if (id) void api.patch(`/me/notifications/${id}`, { read: true }).then(() => qc.invalidateQueries({ queryKey: keys.notifications }));
      router.push(appHref(href));
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener(() => void qc.invalidateQueries({ queryKey: keys.notifications }));
    return () => {
      sub.remove();
      received.remove();
    };
  }, [learner, qc]);

  useActivityTracker(learner ? user : null);
  const applyUser = useApplyUser();
  const syncZone = useCallback(
    (timezone: string) => void api.patch<{ user: User }>("/me/preferences", { timezone }).then((r) => applyUser(r.user)).catch(() => {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useTimezoneSync(learner ? user : null, syncZone);

  const counts = useNotificationCounts();
  useEffect(() => {
    if (counts.data) void setBadge(counts.data.unread);
  }, [counts.data]);

  const navTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <View style={{ flex: 1 }} onTouchStart={markInput}>
    <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, primary: c.primary, background: c.background, card: c.card, text: c.foreground, border: c.border, notification: c.danger } }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerTintColor: c.primary,
          headerTitleStyle: { fontFamily: fonts.semibold, color: c.foreground },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ presentation: "modal", headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ presentation: "modal", headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !learner}>
          <Stack.Screen name="setup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={learner}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lesson/[id]" options={{ title: "", headerTransparent: true, headerBlurEffect: scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterial" }} />
          <Stack.Screen name="practice/[id]" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="article/[slug]" options={{ title: "", headerTransparent: true, headerBlurEffect: scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterial" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications", presentation: "modal" }} />
          <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal", headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <Toaster />
    </ThemeProvider>
    </View>
  );
}
