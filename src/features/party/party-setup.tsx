"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { requestJson } from "@/lib/http";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { useLogout } from "@/features/shell/shell-actions";
import { DriveControls } from "@/features/study/drive-controls";

function CreatePartyForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError("");
        try {
          await requestJson("/api/parties", {
            name: form.get("name"),
            examDate: form.get("examDate") || null,
            capacity: Number(form.get("capacity")),
          });
          router.replace("/dashboard");
          router.refresh();
        } catch {
          setError("파티를 만들지 못했어요. 잠시 후 다시 시도해 주세요");
        } finally {
          setPending(false);
        }
      }}
    >
      <TextField
        id="party-name"
        name="name"
        label="파티 이름"
        required
        maxLength={40}
        placeholder="우리 토익 스터디"
      />
      <TextField
        id="party-exam"
        name="examDate"
        label="시험일 (선택)"
        type="date"
      />
      <TextField
        id="party-capacity"
        name="capacity"
        label="정원"
        type="number"
        min={2}
        max={20}
        defaultValue={6}
        required
      />
      {error && (
        <p role="alert" className="text-meta text-muted">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "만드는 중…" : "파티 만들기"}
      </Button>
    </form>
  );
}

export function PartySetup() {
  const logout = useLogout();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-auth flex-col justify-center gap-5 px-5 py-12">
      <h1 className="m-0 text-h3">함께 공부할 파티를 만들어요</h1>
      <p className="text-body text-muted">
        초대 링크를 받았다면 그 링크로 접속해 참가할 수 있어요. 직접 파티를
        만들고 친구를 초대해도 좋아요.
      </p>
      <CreatePartyForm />
      <DriveControls />
      <Button variant="ghost" onClick={logout}>
        로그아웃
      </Button>
    </main>
  );
}

/**
 * 내 메뉴의 파티 목록. 고르면 바로 전환하고 홈으로 간다.
 * 드롭다운(Select)은 화면 아래쪽에서 목록이 잘리기 쉬워 라디오 카드로 펼쳐 둔다.
 */
export function PartyList() {
  const router = useRouter();
  const parties = useStudyStore((s) => s.parties);
  const party = useStudyStore((s) => s.party);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  const select = async (partyId: string) => {
    if (partyId === party?.id || pending) return;
    setPending(partyId);
    setError("");
    try {
      await requestJson("/api/parties/select", { partyId });
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("파티를 전환하지 못했어요. 잠시 후 다시 시도해 주세요");
      setPending(null);
    }
  };

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={Boolean(pending)}>
      <legend className="sr-only">현재 파티</legend>
      {parties.map((p) => {
        const active = p.id === party?.id;
        return (
          <label
            key={p.id}
            className={cn("radio card flex-row gap-3 p-3.5", active ? "shadow-ring-accent" : "elev-sm")}
          >
            <input
              type="radio"
              name="active-party"
              value={p.id}
              checked={active}
              onChange={() => select(p.id)}
            />
            <span className="dot" />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            {pending === p.id ? (
              <span className="text-label text-muted">전환하는 중…</span>
            ) : (
              active && <span className="tag tag-accent">지금 파티</span>
            )}
          </label>
        );
      })}
      {error && (
        <p role="alert" className="m-0 text-meta text-muted">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** 새 파티 만들기 — 다이얼로그(모바일은 바텀시트)로 기존 생성 폼을 연다 */
export function NewPartyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        새 파티 만들기
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel="닫기">
          <DialogTitle>파티 만들기</DialogTitle>
          <CreatePartyForm />
        </DialogContent>
      </Dialog>
    </>
  );
}
