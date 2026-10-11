"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestJson } from "@/lib/http";
import { partyErrorMessage, type InvitePreview } from "./party-schema";

export function JoinParty() {
  const router = useRouter();
  const code = useSearchParams().get("invite") ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const preview = useQuery({
    queryKey: ["invite", code],
    retry: false,
    queryFn: async (): Promise<InvitePreview> => {
      const response = await fetch(
        `/api/parties/invite?code=${encodeURIComponent(code)}`,
      );
      if (!response.ok) throw new Error("invalid_invite");
      return response.json();
    },
  });
  return (
    <main className="mx-auto flex min-h-dvh max-w-auth flex-col justify-center gap-5 px-5">
      <h1 className="text-h3">파티 초대</h1>
      {preview.isPending ? (
        <p role="status">초대 정보를 확인하고 있어요…</p>
      ) : preview.data ? (
        <p>
          {preview.data.inviterName}님이 {preview.data.partyName}에 초대했어요.
          ({preview.data.memberCount}/{preview.data.capacity}명)
        </p>
      ) : (
        <p role="alert">유효하지 않은 초대 링크예요</p>
      )}
      {error && <p role="alert">{error}</p>}
      <Button
        variant="primary"
        disabled={!preview.data || pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            await requestJson("/api/parties/join", { code });
            router.replace("/dashboard");
            router.refresh();
          } catch (cause) {
            setError(
              partyErrorMessage(cause instanceof Error ? cause.message : ""),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "참가하는 중…" : "파티 참가하기"}
      </Button>
      <Link href="/dashboard">홈으로 돌아가기</Link>
    </main>
  );
}
