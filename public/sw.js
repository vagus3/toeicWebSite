/* 새벽 토익 서비스 워커 — 푸시 수신 · 알림 클릭 이동 · 앱 셸 캐시 */
const CACHE = "dawn-toeic-v2";
const APP_SHELL = ["/dashboard", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* 페이지 이동은 네트워크 우선 — 성공하면 그 화면을 캐시에 갱신, 오프라인이면 마지막으로 본 화면(없으면 홈) */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/dashboard"))),
  );
});

/* 발신자 이름 · 파티 이름 · 메시지 미리보기 */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    (async () => {
      // 해당 채팅방을 이미 보고 있으면 중복 알림을 띄우지 않는다
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const target = new URL(data.url || "/", self.location.origin).pathname;
      if (windows.some((c) => c.focused && new URL(c.url).pathname === target)) return;
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag,
        renotify: Boolean(data.tag),
        data: { url: data.url || "/dashboard" },
      });
    })(),
  );
});

/* 알림을 누르면 해당 채팅방으로 — 열린 창이 있으면 그 창을 이동 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
