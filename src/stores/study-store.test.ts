import { afterEach, describe, expect, it, vi } from "vitest";
import { createStudyStore } from "./study-store";
import type { StudyDetail, StudySnapshot } from "@/lib/study-model";

const EMPTY_DETAIL: StudyDetail = {
  memberStats: {},
  logs: [],
  scores: [],
  feed: [],
  feedCheers: [],
  threads: [],
  quizScore: null,
};

/** 첫 화면에 필요한 코어 데이터. 실제 파티는 상세가 null로 시작한다. */
function snapshot(detail: StudyDetail | null = null): StudySnapshot {
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
    done: { word: false, lc: false, rc: false, book: false },
    nudgedIds: [],
    detail,
  };
}

/** 서버 응답 형태 그대로 — 코어 GET은 detail 키가 없다 */
function core(snap: StudySnapshot) {
  const rest: Partial<StudySnapshot> = { ...snap };
  delete rest.detail;
  return rest;
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
  it("저장 후 코어와 상세를 다시 읽어 같은 기록을 표시한다", async () => {
    const persisted = snapshot({
      ...EMPTY_DETAIL,
      scores: [{ label: "2026-10-11", value: 755 }],
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ saved: true }))
      .mockResolvedValueOnce(Response.json(core(persisted)))
      .mockResolvedValueOnce(Response.json(persisted.detail));
    vi.stubGlobal("fetch", fetch);
    const store = createStudyStore(snapshot(EMPTY_DETAIL));
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
      action: "score",
      lc: 370,
      rc: 385,
      partyId: persisted.party!.id,
    });
    expect(store.getState().scores).toEqual(persisted.detail!.scores);
    expect(createStudyStore(persisted).getState().scores).toEqual(
      persisted.detail!.scores,
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
    const store = createStudyStore(snapshot(EMPTY_DETAIL));
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(true);
    expect(store.getState().saving).toBe(false);
  });
});

describe("코어와 상세 분리", () => {
  it("상세가 없으면 로딩 전 상태이고, 멤버 통계는 비어 있다", () => {
    const store = createStudyStore(snapshot());
    expect(store.getState().detailReady).toBe(false);
    expect(store.getState().threads).toEqual([]);
  });
  it("코어만 갱신해도 상세 통계는 멤버에 그대로 남는다", async () => {
    const base = snapshot(EMPTY_DETAIL);
    base.members = [
      { id: "m1", name: "가", initial: "가", track: "800", quota: 25, book: { done: 0, total: 0 }, score: null, streak: 0, baseline: 0 },
    ];
    const detail = { ...EMPTY_DETAIL, memberStats: { m1: { book: { done: 3, total: 24 }, score: 700, streak: 4 } } };
    const withMembers = { ...base, detail };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(core(withMembers)))
      .mockResolvedValueOnce(Response.json(detail));
    vi.stubGlobal("fetch", fetch);
    const store = createStudyStore(withMembers);
    expect(store.getState().members[0].streak).toBe(4);
    await store.getState().refresh();
    expect(store.getState().members[0]).toMatchObject({ streak: 4, score: 700, quota: 25 });
  });
  it("상세 로드에 실패하면 오류 상태를 표시하고 로딩을 끝내지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("failed", { status: 500 })));
    const store = createStudyStore(snapshot());
    await store.getState().loadDetail();
    expect(store.getState().detailReady).toBe(false);
    expect(store.getState().detailError).toBe(true);
  });
  it("첫 상세 로드가 실패해도 다음 갱신에서 다시 불러와 오류 상태를 푼다", async () => {
    const detail = { ...EMPTY_DETAIL, scores: [{ label: "10/11", value: 700 }] };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("failed", { status: 500 }))
      .mockResolvedValueOnce(Response.json(core(snapshot())))
      .mockResolvedValueOnce(Response.json(detail));
    vi.stubGlobal("fetch", fetch);
    const store = createStudyStore(snapshot());
    await store.getState().loadDetail();
    expect(store.getState().detailError).toBe(true);
    await store.getState().refresh();
    expect(store.getState()).toMatchObject({ detailReady: true, detailError: false });
    expect(store.getState().scores).toEqual(detail.scores);
  });
  it("상세 로딩 중 저장하면 늦게 도착한 이전 응답이 새 점수를 덮어쓰지 않는다", async () => {
    const saved = { ...EMPTY_DETAIL, scores: [{ label: "10/11", value: 755 }] };
    let resolveStale!: (res: Response) => void;
    const stale = new Promise<Response>((resolve) => (resolveStale = resolve));
    const fetch = vi
      .fn()
      // 1) 저장 전에 시작된 첫 상세 요청은 오래 걸린다
      .mockReturnValueOnce(stale)
      // 2) 저장 POST, 3) 코어 GET, 4) 저장 후 상세 GET
      .mockResolvedValueOnce(Response.json({ saved: true }))
      .mockResolvedValueOnce(Response.json(core(snapshot())))
      .mockResolvedValueOnce(Response.json(saved));
    vi.stubGlobal("fetch", fetch);
    const store = createStudyStore(snapshot());
    const loading = store.getState().loadDetail();
    expect(await store.getState().addScore(370, 385, "10/11")).toBe(true);
    // 이전 응답은 점수가 없는 상태로 뒤늦게 도착한다
    resolveStale(Response.json({ ...EMPTY_DETAIL, scores: [] }));
    await loading;
    expect(store.getState().detailReady).toBe(true);
    expect(store.getState().scores).toEqual(saved.scores);
  });
});
