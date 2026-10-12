import type { Metadata } from "next";
import { MyPage } from "@/features/me/my-page";

export const metadata: Metadata = { title: "내 메뉴" };

export default function MePage() {
  return <MyPage />;
}
