import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudyStore } from "./study-store";
import type { StudySnapshot } from "@/lib/study-model";

function snapshot(): StudySnapshot {
  return {
    mode: "live",
    studyDate: "2026-10-11",
    me: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "나",
      initial: "나",
      target: 800,
      track: "800",
    },
    party: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "파티",
      brand: "새벽 토익",
      capacity: 6,
      examDate: null,
      examLabel: "미정",
      driveRoot: "파티",
      inviteUrl: "/invite/test",
      defaultChatRoomId: "room",
      createdAt: "2026-10-01",
    },
    parties: [],
    members: [],
    logs: [],
    done: { word: false, lc: false, rc: false, book: false },
    scores: [],
    feed: [],
    feedCheers: [],
    nudgedIds: [],
    threads: [],
    quizScore: null,
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("DB 저장과 화면 상태", () => {
  it("인증 완료 항목도 다시 열고 다른 완료 항목으로 변경할 수 있다", () => {
    const initial = snapshot();
    initial.done = { word: true, lc: true, rc: false, book: false };
    const store = createStudyStore(initial);
    store.getState().openUpload("word");
    expect(store.getState().modal).toBe("upload");
    expect(store.getState().uploadSelection).toBe("word");
    store.getState().selectUpload("lc");
    expect(store.getState().uploadSelection).toBe("lc");
    expect(store.getState().done).toEqual(initial.done);
  });
  it("모든 항목이 인증돼도 추가 업로드할 기본 항목을 선택한다", () => {
    const initial = snapshot();
    initial.done = { word: true, lc: true, rc: true, book: true };
    const store = createStudyStore(initial);
    expect(store.getState().uploadSelection).not.toBeNull();
    store.getState().openUpload();
    expect(store.getState().modal).toBe("upload");
    expect(store.getState().uploadSelection).not.toBeNull();
  });
  it("서버 저장 실패 시 점수와 모달을 성공 상태로 바꾸지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("failed", { status: 500 })),
    );
    const store = createStudyStore(snapshot());
    store.getState().openScore();
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(false);
    expect(store.getState().scores).toEqual([]);
    expect(store.getState().modal).toBe("score");
  });
  it("저장 후 DB 결과를 불러오며 새 스토어에서도 같은 기록을 표시한다", async () => {
    const persisted = {
      ...snapshot(),
      scores: [{ label: "2026-10-11", value: 755 }],
    };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ saved: true }))
      .mockResolvedValueOnce(Response.json(persisted));
    vi.stubGlobal("fetch", fetch);
    const store = createStudyStore(snapshot());
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: "score",
      lc: 370,
      rc: 385,
      partyId: persisted.party!.id,
    });
    expect(store.getState().scores).toEqual(persisted.scores);
    expect(createStudyStore(persisted).getState().scores).toEqual(
      persisted.scores,
    );
    expect(createStudyStore(snapshot()).getState().scores).toEqual([]);
  });
  it("저장 성공 후 조회만 실패하면 중복 저장을 유도하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ saved: true }))
        .mockResolvedValueOnce(new Response("failed", { status: 500 })),
    );
    const store = createStudyStore(snapshot());
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(true);
    expect(store.getState().saving).toBe(false);
  });
});
