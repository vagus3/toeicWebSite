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
  return async () => {
    try {
      const response = await fetch("/api/drive", { cache: "no-store" });
      const status = response.ok ? await response.json() : null;
      if (status?.connected && status.folderUrl)
        window.location.assign(status.folderUrl);
      else flash("화면의 내 Drive 연결에서 먼저 연결해 주세요");
    } catch {
      flash("Drive 연결 상태를 확인하지 못했어요");
    }
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
