/* Service worker do Mais Conectados: mostra os avisos (push) com som do aparelho e número no ícone. */
const CACHE_CONTAGEM = "mc-contagem";
const CHAVE = "/__contagem";

async function lerContagem() {
  const c = await caches.open(CACHE_CONTAGEM);
  const r = await c.match(CHAVE);
  return r ? Number(await r.text()) || 0 : 0;
}
async function gravarContagem(n) {
  const c = await caches.open(CACHE_CONTAGEM);
  await c.put(CHAVE, new Response(String(n)));
  if (self.navigator && "setAppBadge" in self.navigator) {
    try {
      if (n > 0) await self.navigator.setAppBadge(n);
      else await self.navigator.clearAppBadge();
    } catch (e) {}
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  const titulo = d.titulo || "Mais Conectados";
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(titulo, {
        body: d.corpo || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: d.tag || undefined,
        data: { url: d.url || "/" },
      });
      await gravarContagem((await lerContagem()) + 1);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      await gravarContagem(0);
      const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of abertas) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "limpar-contagem") event.waitUntil(gravarContagem(0));
});
