// public/sw.js  — place this in your frontend/public/ folder

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "🚨 Emergency Alert", body: event.data.text() };
  }

  const options = {
    body: data.body || "New emergency alert received",
    icon: data.icon || "/ambulance-icon.png",
    badge: data.badge || "/badge.png",
    tag: data.tag || "emergency-alert",
    renotify: true,
    requireInteraction: true,          // stays visible until dismissed
    vibrate: [300, 100, 300, 100, 300], // SOS pattern
    sound: "/alert.mp3",
    data: data.data || {},
    actions: [
      { action: "view", title: "📋 View Alert" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "🚨 Emergency Alert", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/hospital";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes("/hospital") && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
