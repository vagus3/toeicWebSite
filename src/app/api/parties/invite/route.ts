import { NextResponse } from "next/server";
import { inviteCodeSchema } from "@/features/party/party-schema";
import { apiError, limitRequest, notConfigured } from "@/lib/api";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const limited = limitRequest(request, "invite-preview", null, 30, 60 * 1000);
  if (limited) return limited;
  const code = inviteCodeSchema.safeParse(
    new URL(request.url).searchParams.get("code"),
  );
  if (!code.success) return apiError(400, "invalid_invite");
  const supabase = await getSupabaseServerClient();
  if (!supabase) return notConfigured("supabase_not_configured");
  const { data, error } = await supabase
    .rpc("preview_party_invite", { p_code: code.data })
    .maybeSingle();
  if (error || !data) return apiError(404, "invalid_invite");
  const preview = data as {
    party_name: string;
    inviter_name: string;
    capacity: number;
    member_count: number;
  };
  return NextResponse.json(
    {
      partyName: preview.party_name,
      inviterName: preview.inviter_name,
      capacity: preview.capacity,
      memberCount: preview.member_count,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
