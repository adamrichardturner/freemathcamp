/* FreeMathCamp service worker: shows Web Push notifications and routes clicks. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const notifyClients = async (message) => {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
};

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "FreeMathCamp", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "FreeMathCamp";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.id || undefined,
        data: { id: data.id, href: data.href || "/learn" },
      }),
      "setAppBadge" in self.navigator && typeof data.badge === "number" ? self.navigator.setAppBadge(data.badge).catch(() => {}) : null,
      // Open tabs refresh their notification badge straight away.
      notifyClients({ type: "fmc:push", id: data.id }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { href = "/learn", id } = event.notification.data || {};
  const url = new URL(href, self.location.origin);
  // Lets the app mark it read once it opens.
  if (id) url.searchParams.set("notification", id);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (same) {
        await same.focus();
        return same.navigate(url.href).catch(() => self.clients.openWindow(url.href));
      }
      return self.clients.openWindow(url.href);
    })(),
  );
});

// Browsers occasionally rotate subscriptions; re-register the new one with the signed-in session.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      const sub = event.newSubscription || (old && (await self.registration.pushManager.subscribe(old.options)));
      if (!sub) return;
      await fetch("/api/me/push/subscriptions", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: "web", endpoint: sub.endpoint, keys: sub.toJSON().keys }),
      }).catch(() => {});
    })(),
  );
});
