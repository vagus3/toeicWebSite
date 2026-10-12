import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/routes";
import { THEME_COLOR } from "@/lib/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "새벽 토익 — 같이 하면 끝까지 가는 토익 스터디",
    short_name: "새벽 토익",
    description: "친구들과 매일 할당량을 사진으로 인증하고 진행률을 확인하는 토익 스터디",
    lang: "ko",
    // 설치된 앱을 구분하는 값. 나중에 start_url을 바꿔도 같은 앱으로 인식되게 고정한다
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR.dark,
    theme_color: THEME_COLOR.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android 런처가 원·물방울 모양으로 잘라 쓰는 아이콘: 배경이 끝까지 차고 글리프는 가운데 80% 안
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      {
        name: "오늘 인증",
        url: ROUTES.upload,
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "파티 채팅",
        url: ROUTES.chatShortcut,
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
