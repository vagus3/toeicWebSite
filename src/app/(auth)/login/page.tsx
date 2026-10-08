import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
