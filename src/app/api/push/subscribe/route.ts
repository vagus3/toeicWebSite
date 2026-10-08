import { NextResponse } from "next/server";
import { z } from "zod";
import { pushSubscriptionSchema } from "@/features/chat/chat-schema";
import { apiError, parseJson, requireSession } from "@/lib/api";

/** 기기별 푸시 구독 등록 — 같은 endpoint면 갱신 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseJson(request, pushSubscriptionSchema);
  if (!body.ok) return body.response;

  const { supabase, user } = session.data;
  const { endpoint, keys } = body.data;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: request.headers.get("user-agent") }, { onConflict: "endpoint" });
  if (error) return apiError(500, "db_failed");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const body = await parseJson(request, z.object({ endpoint: z.url() }));
  if (!body.ok) return body.response;

  const { supabase, user } = session.data;
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.data.endpoint);
  return NextResponse.json({ ok: true });
}
