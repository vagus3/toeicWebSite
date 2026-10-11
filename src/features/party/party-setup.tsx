"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { requestJson } from "@/lib/http";
import { useStudyStore } from "@/stores/study-store";
import { useCopyInvite, useLogout } from "@/features/shell/shell-actions";
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

export function PartyControls() {
  const router = useRouter();
  const parties = useStudyStore((s) => s.parties);
  const party = useStudyStore((s) => s.party);
  const mode = useStudyStore((s) => s.mode);
  const copyInvite = useCopyInvite();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (mode === "demo") return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-meta">
      <label htmlFor="active-party" className="sr-only">
        현재 파티
      </label>
      <select
        id="active-party"
        className="input w-auto"
        value={party?.id ?? ""}
        disabled={pending}
        onChange={async (event) => {
          setPending(true);
          setError("");
          try {
            await requestJson("/api/parties/select", {
              partyId: event.target.value,
            });
            router.replace("/dashboard");
            router.refresh();
          } catch {
            setError("파티를 전환하지 못했어요");
          } finally {
            setPending(false);
          }
        }}
      >
        {parties.map((p) => (
          <option value={p.id} key={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button variant="secondary" onClick={copyInvite}>
        초대 링크 복사
      </Button>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        새 파티
      </Button>
      {error && <span role="alert">{error}</span>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>파티 만들기</DialogTitle>
          <CreatePartyForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
