"use client";

import { useRouter } from "next/navigation";
import { PARTY } from "@/lib/demo-data";
import { ROUTES } from "@/lib/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/toast-store";

export function useCopyInvite() {
  const flash = useToast((s) => s.flash);
  return async () => {
    try {
      await navigator.clipboard.writeText(PARTY.inviteUrl);
    } catch {
      // 권한이 없거나 http 환경이면 복사만 건너뛴다
    }
    flash("초대 링크를 복사했어요");
  };
}

export function useDriveFolder() {
  const flash = useToast((s) => s.flash);
  return () => {
    const url = process.env.NEXT_PUBLIC_DRIVE_FOLDER_URL;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else flash("드라이브 폴더가 아직 연결되지 않았어요");
  };
}

export function useLogout() {
  const router = useRouter();
  return async () => {
    await getSupabaseBrowserClient()?.auth.signOut();
    router.push(ROUTES.login);
  };
}
