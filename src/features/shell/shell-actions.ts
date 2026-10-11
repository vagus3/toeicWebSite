"use client";

import { useRouter } from "next/navigation";
import { useStudyStore } from "@/stores/study-store";
import { ROUTES } from "@/lib/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/stores/toast-store";

export function useCopyInvite() {
  const flash = useToast((s) => s.flash);
  const party = useStudyStore((s) => s.party);
  return async () => {
    try {
      if (!party) return;
      await navigator.clipboard.writeText(
        new URL(party.inviteUrl, window.location.origin).href,
      );
    } catch {
      flash("초대 링크를 복사하지 못했어요. 브라우저 권한을 확인해 주세요");
      return;
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
    router.refresh();
  };
}
