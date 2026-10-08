import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "새벽 토익 — 같이 하면 끝까지 가는 토익 스터디",
    short_name: "새벽 토익",
    description: "친구들과 매일 할당량을 사진으로 인증하고 진행률을 확인하는 토익 스터디",
    lang: "ko",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR.dark,
    theme_color: THEME_COLOR.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      {
        name: "오늘 인증",
        url: "/study/upload",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "파티 채팅",
        url: "/party/dawn-4/chat/general",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
