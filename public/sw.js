// Service Worker para Gold Lion Academy PWA
// Versione o cache a cada deploy importante para forcar atualizacao no cliente.
const CACHE_NAME = "gold-lion-v2";

// Arquivos estaticos para precache (so o root e offline; paginas dinamicas nao)
const PRECACHE_URLS = ["/", "/offline.html"];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll falha tudo se 1 falhar; usar add individual para tolerar 404
      Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => null))
      )
    )
  );
  // NAO chama skipWaiting automatico aqui: deixamos o usuario aprovar via banner.
});

// Activate - limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Listener para troca rapida quando o usuario clica em "Atualizar"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Nunca cachear chamadas de API (/api/*) e do supabase
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push Notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || "Nova notificacao da Gold Lion Academy",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
    },
    actions: [{ action: "open", title: "Abrir" }],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Gold Lion Academy",
      options
    )
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
