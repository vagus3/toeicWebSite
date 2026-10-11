"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { HttpError, requestJson } from "@/lib/http";
import { pickDriveFolder } from "./drive-folder-picker";
import { useStudyStore } from "@/stores/study-store";

export type DriveStatus = {
  configured: boolean;
  connected: boolean;
  email?: string | null;
  folderUrl?: string | null;
  pickerEnabled?: boolean;
};

export function useDriveStatus() {
  const me = useStudyStore((s) => s.me);
  const mode = useStudyStore((s) => s.mode);
  return useQuery({
    queryKey: ["personal-drive", me.id],
    enabled: mode === "live",
    staleTime: 0,
    queryFn: async (): Promise<DriveStatus> => {
      const response = await fetch("/api/drive", { cache: "no-store" });
      if (!response.ok) throw new Error("drive_status_failed");
      return response.json();
    },
  });
}

const NOTICES: Record<string, string> = {
  connected: "내 Drive를 연결했어요. 인증 사진은 이 계정에 저장돼요.",
  cancelled: "Drive 연결을 취소했어요. 다시 연결할 수 있어요.",
  invalid_state: "연결 요청이 만료됐어요. 내 Drive 연결을 다시 눌러 주세요.",
  failed: "Drive를 연결하지 못했어요. 권한을 허용하고 다시 시도해 주세요.",
  api_disabled: "Google Drive API가 활성화되지 않아 연결하지 못했어요. 운영자가 API를 활성화해야 합니다.",
  client_invalid: "Google 연결 설정을 확인해야 해요. 운영자에게 알려 주세요.",
  redirect_mismatch: "Google에 등록된 Drive 연결 복귀 주소를 확인해야 해요. 운영자에게 알려 주세요.",
  code_expired: "Google 연결 요청이 만료되었거나 이미 사용됐어요. 내 Drive 연결을 다시 눌러 주세요.",
  permission_missing: "Drive 파일 접근 권한이 허용되지 않았어요. 다시 연결하면서 파일 권한을 허용해 주세요.",
  refresh_token_missing: "Drive 연결 유지 권한을 받지 못했어요. 내 Drive 연결을 다시 눌러 주세요.",
  storage_failed: "Drive 연결 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  not_configured: "서버의 Drive 연결 설정이 준비되지 않았어요. 운영자에게 알려 주세요.",
  account_mismatch:
    "기존 사진을 확인하려면 처음 연결했던 Google 계정으로 다시 연결해 주세요.",
};

function DriveControlsContent() {
  const mode = useStudyStore((s) => s.mode);
  const status = useDriveStatus();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  if (mode === "demo") return null;
  const connected = status.data?.connected;
  async function changeFolder() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/drive/folder", { cache: "no-store" });
      if (!response.ok) throw new HttpError(response.status, await response.text());
      const folder = await pickDriveFolder(await response.json());
      if (!folder) return;
      await requestJson("/api/drive/folder", { folderId: folder.id }, "PUT");
      await queryClient.invalidateQueries({ queryKey: ["personal-drive"] });
      setMessage(
        `이제 '${folder.name}' 폴더에 저장돼요. 기존 사진은 원래 위치에 그대로 남아요.`,
      );
    } catch (error) {
      setMessage(
        error instanceof HttpError && error.status === 400
          ? "이 폴더에는 저장할 수 없어요. 내가 파일을 추가할 수 있는 폴더를 골라 주세요."
          : error instanceof HttpError && error.status === 409
            ? "Drive 연결이 만료됐어요. 다시 연결한 뒤 폴더를 골라 주세요."
            : "폴더를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      aria-label="개인 Google Drive 연결"
      className="card flex flex-col gap-2 p-4 text-meta"
    >
      <div className="flex flex-wrap items-center gap-3">
        <b>내 Google Drive {connected ? "연결됨" : "연결"}</b>
        {connected && <span className="text-muted">{status.data?.email}</span>}
        <Button
          variant="secondary"
          disabled={pending || status.isPending || !status.data?.configured}
          onClick={async () => {
            setPending(true);
            setMessage("");
            try {
              const result = await requestJson<{ url: string }>(
                "/api/drive/connect",
                {},
              );
              window.location.assign(result.url);
            } catch {
              setMessage(
                "Drive 연결을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
              );
              setPending(false);
            }
          }}
        >
          {pending ? "처리 중…" : connected ? "다시 연결" : "내 Drive 연결"}
        </Button>
        {connected && status.data?.folderUrl && (
          <a
            href={status.data.folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            내 Drive 폴더 열기
          </a>
        )}
        {connected && status.data?.pickerEnabled && (
          <Button variant="ghost" disabled={pending} onClick={changeFolder}>
            저장 폴더 변경
          </Button>
        )}
        {connected && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await requestJson("/api/drive", {}, "DELETE");
                await queryClient.invalidateQueries({
                  queryKey: ["personal-drive"],
                });
                setMessage(
                  "연결을 해제했어요. 사진은 Drive에 남으며, 다시 연결하면 앱에서 확인할 수 있어요.",
                );
              } catch {
                setMessage("연결을 해제하지 못했어요. 다시 시도해 주세요.");
              } finally {
                setPending(false);
              }
            }}
          >
            연결 해제
          </Button>
        )}
      </div>
      <p className="text-muted">
        사진은 내 Drive에 저장되고 같은 파티원은 이 웹사이트에서 볼 수 있어요.
        연결 해제 시 앱에서 사진 조회가 중단됩니다.
      </p>
      {connected && (
        <p className="text-muted">
          저장 폴더 안에 &lsquo;파티 이름/연-월&rsquo; 폴더가 자동으로 만들어져요.
          저장 폴더는 Drive에서 다른 곳으로 옮기거나 이름을 바꿔도 계속 그
          폴더에 저장돼요.
        </p>
      )}
      {(status.isError || (status.data && !status.data.configured)) && (
        <p role="status">
          현재 Drive 연결을 사용할 수 없어요. 연결 준비가 끝나면 이용할 수
          있어요.
        </p>
      )}
      {(message || NOTICES[params.get("drive") ?? ""]) && (
        <p role="status">{message || NOTICES[params.get("drive") ?? ""]}</p>
      )}
    </section>
  );
}

export function DriveControls() {
  return (
    <Suspense>
      <DriveControlsContent />
    </Suspense>
  );
}
