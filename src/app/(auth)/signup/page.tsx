import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen } from "@/features/auth/auth-screen";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthScreen mode="signup" />
    </Suspense>
  );
}
