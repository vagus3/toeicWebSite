import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected))
    return Response.json({ error: "unauthorized" }, { status: 401, headers });

  const admin = getSupabaseAdminClient();
  if (!admin)
    return Response.json({ error: "retention_not_configured" }, { status: 503, headers });

  try {
    // 파라미터 생략은 dry-run이다. 실제 Cron만 명시적으로 삭제를 요청한다.
    const purged = await admin.rpc("purge_expired_records", { p_dry_run: false });
    if (purged.error || !purged.data) throw new Error("purge_failed");
    if (purged.data.locked)
      return Response.json({ skipped: true, reason: "already_running" }, { headers });

    const claimed = await admin.rpc("claim_retention_files");
    if (claimed.error) throw new Error("claim_failed");
    let filesDeleted = 0;
    let filesFailed = 0;
    for (const file of claimed.data ?? []) {
      // 파일 하나의 실패가 나머지 파일 정리를 막지 않는다. Drive API는 호출하지 않는다.
      try {
        const removed = await admin.storage.from("study-evidence").remove([file.storage_path]);
        if (removed.error) throw new Error("storage_cleanup_failed");
        const acknowledged = await admin.from("retention_file_cleanup").delete()
          .eq("storage_path", file.storage_path).eq("claim_id", file.claim_id);
        if (acknowledged.error) throw new Error("cleanup_ack_failed");
        filesDeleted++;
      } catch {
        filesFailed++;
        // 중단/실패한 작업의 lease는 만료되므로 다음 일일 실행에서 재시도한다.
      }
    }
    const result = { counts: purged.data.counts, filesDeleted, filesFailed };
    console.info("retention_completed", result);
    return Response.json(result, { status: filesFailed ? 503 : 200, headers });
  } catch {
    console.error("retention_failed");
    return Response.json({ error: "retention_failed" }, { status: 503, headers });
  }
}
