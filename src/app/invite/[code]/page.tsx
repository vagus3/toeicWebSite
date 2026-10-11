import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";

/** 초대 링크 → 회원가입 화면 (초대 배너 표시, 가입 후 파티 자동 참가) */
export default async function InvitePage({
  params,
}: PageProps<"/invite/[code]">) {
  const { code } = await params;
  const user = await getSessionUser();
  redirect(`${user ? "/join" : "/signup"}?invite=${encodeURIComponent(code)}`);
}
