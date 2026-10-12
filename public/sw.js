/* 새벽 토익 서비스 워커 — 푸시 수신 · 알림 클릭 이동 · 앱 셸 캐시 */
const CACHE = "dawn-toeic-v3";
const APP_SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dawn-toeic-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* 개인 기록과 초대 링크가 포함된 HTML은 캐시에 남기지 않는다. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  event.respondWith(
    fetch(request).catch(() => caches.match("/offline.html")),
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
        // Android 상태 표시줄 배지는 알파만 쓴다 — 흰 글리프 + 투명 배경 (컬러 아이콘이면 흰 네모로 보인다)
        badge: "/icons/badge-96.png",
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
