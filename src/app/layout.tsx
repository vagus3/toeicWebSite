import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import { THEME_COLOR, themeInitScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "새벽 토익", template: "%s · 새벽 토익" },
  description: "링크로 파티에 참가하고, 매일 할당량을 사진으로 인증하고, 서로의 진행률을 트래커로 확인하는 토익 스터디",
  applicationName: "새벽 토익",
  appleWebApp: { capable: true, title: "새벽 토익", statusBarStyle: "black-translucent" },
  // Next는 표준 mobile-web-app-capable을 출력 — 구형 iOS용 apple- 접두 버전도 함께
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR.dark,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
