"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isNotConfigured, requestJson } from "@/lib/http";
import { useToast } from "@/stores/toast-store";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type PushState = "unsupported" | "idle" | "subscribed" | "denied";

const noopSubscribe = () => () => {};
const isPushSupported = () => "serviceWorker" in navigator && "PushManager" in window;

/** 서버 기능 키가 없어서(501) 건너뛴 경우는 성공으로 본다 */
async function saveOnServer(url: string, body: unknown, method: "POST" | "DELETE") {
  try {
    await requestJson(url, body, method);
  } catch (error) {
    if (!isNotConfigured(error)) throw error;
  }
}

/**
 * 채팅·콕 찌르기 Web Push 구독.
 * iOS는 16.4+에서 홈 화면에 설치된 PWA일 때만 동작한다.
 */
export function usePushSubscription() {
  const flash = useToast((s) => s.flash);
  const supported = useSyncExternalStore(noopSubscribe, isPushSupported, () => true);
  const [status, setStatus] = useState<Exclude<PushState, "unsupported">>("idle");
  const state: PushState = supported ? status : "unsupported";
  const subscribed = state === "subscribed";

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      if (await reg?.pushManager.getSubscription()) setStatus("subscribed");
      else if (Notification.permission === "denied") setStatus("denied");
    });
  }, [supported]);

  const subscribe = async () => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!supported)
      return flash("이 브라우저는 알림을 지원하지 않아요 · iPhone은 홈 화면에 추가 후 사용");
    if (!vapid) return flash("서버에 VAPID 키를 설정하면 알림을 켤 수 있어요");
    if ((await Notification.requestPermission()) !== "granted") {
      setStatus("denied");
      return flash("브라우저 설정에서 알림을 허용해 주세요");
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      await saveOnServer("/api/push/subscribe", sub.toJSON(), "POST");
      setStatus("subscribed");
      flash("새 메시지 알림을 켰어요");
    } catch {
      flash("알림 등록에 실패했어요");
    }
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await saveOnServer("/api/push/subscribe", { endpoint: sub.endpoint }, "DELETE").catch(
        () => {},
      );
      await sub.unsubscribe();
    }
    setStatus("idle");
    flash("알림을 껐어요");
  };

  return { state, subscribed, toggle: subscribed ? unsubscribe : subscribe };
}
