/* Antnäs Vinter service worker: push notifications only (no offline cache,
   so users always see fresh rink status). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Antnäs Vinter", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Antnäs Vinter";
  // Open app windows refresh their data so they match the notification.
  const tellOpenWindows = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((wins) => wins.forEach((w) => w.postMessage({ type: "push", tag: data.tag || null })));
  event.waitUntil(
    Promise.all([tellOpenWindows, self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/" },
      lang: "sv",
    })])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
