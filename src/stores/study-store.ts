"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { TASKS } from "@/lib/demo-data";
import { HttpError, requestJson } from "@/lib/http";
import {
  EMPTY_MEMBER_STATS,
  type MemberStats,
  type StudyCore,
  type StudyDetail,
  type StudySnapshot,
} from "@/lib/study-model";
import type { StudyAction } from "@/features/study/study-schema";
import { useToast } from "./toast-store";
import type { Member, QnaThread, StudyCategory } from "@/types";

type StudyInput<T = StudyAction> = T extends StudyAction
  ? Omit<T, "partyId">
  : never;

export type Modal = "upload" | "score" | "question" | null;

/**
 * 질문하기를 다른 화면에서 열 때 미리 채울 내용 (퀴즈·AI RC 해설의 "질문 창구에 올리기").
 * stay면 질문을 올린 뒤 질문 상세로 옮기지 않고 그 자리에 남는다 (풀던 문제를 잃지 않게).
 */
export interface QuestionDraft {
  tag: Extract<StudyAction, { action: "question" }>["tag"];
  title: string;
  stay?: boolean;
}
interface StudyState extends StudyCore, StudyDetail {
  /** 상세 기록이 한 번이라도 도착했는지. false인 동안 상세를 쓰는 화면은 로딩 상태를 보인다. */
  detailReady: boolean;
  detailError: boolean;
  modal: Modal;
  uploadSelection: StudyCategory | null;
  questionDraft: QuestionDraft | null;
  saving: boolean;
  openUpload: (category?: StudyCategory) => void;
  selectUpload: (category: StudyCategory) => void;
  openScore: () => void;
  openQuestion: (draft?: QuestionDraft) => void;
  closeModal: () => void;
  completeTask: (category: StudyCategory) => void;
  addScore: (lc: number, rc: number, label: string) => Promise<boolean>;
  cheerFeed: (index: number) => Promise<boolean>;
  cheerLog: (logId: string) => Promise<boolean>;
  nudge: (memberId: string) => Promise<boolean>;
  finishQuiz: (score: number, answers: number[]) => Promise<boolean>;
  addReply: (threadId: string, text: string) => Promise<boolean>;
  addThread: (thread: QnaThread) => void;
  askAi: (threadId: string, prompt: string) => Promise<boolean>;
  /** AI 답변 확인·취소. turnId가 null이면 첫 AI 답변 */
  confirmAi: (
    threadId: string,
    turnId: string | null,
    confirmed: boolean,
  ) => Promise<boolean>;
  /** 저장하면 새 질문의 id를 돌려준다 (상세 화면으로 이동). 실패하면 null, id를 못 찾으면 "" */
  saveQuestion: (
    tag: Extract<StudyAction, { action: "question" }>["tag"],
    title: string,
  ) => Promise<string | null>;
  refresh: () => Promise<void>;
  loadDetail: () => Promise<void>;
}

const EMPTY_DETAIL: StudyDetail = {
  memberStats: {},
  logs: [],
  scores: [],
  feed: [],
  feedCheers: [],
  threads: [],
  quizScore: null,
};

/** 코어 갱신 때 상세 통계를 잃지 않도록 멤버에 다시 붙인다. */
function withStats(
  members: Member[],
  stats: Record<string, MemberStats>,
): Member[] {
  return members.map((m) => ({ ...m, ...(stats[m.id] ?? EMPTY_MEMBER_STATS) }));
}

// 요청마다 새 스토어를 만든다. 서버 렌더링 중 사용자의 상태가 서로 섞이지 않는다.
export function createStudyStore(initial: StudySnapshot) {
  const { detail, ...core } = initial;
  const data = detail ?? EMPTY_DETAIL;
  return createStore<StudyState>()((set, get) => {
    let refreshVersion = 0;
    let detailVersion = 0;

    // 코어와 상세를 함께 다시 읽는다. 상세는 준비 전이어도 요청해서
    // 저장 직후의 갱신이 빠지지 않고, 실패한 상세도 다음 갱신에서 재시도되게 한다.
    const refresh = async () => {
      if (get().mode === "demo") return;
      const version = ++refreshVersion;
      const response = await fetch(
        `/api/study?partyId=${encodeURIComponent(get().party?.id ?? "")}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("study_load_failed");
      const nextCore = (await response.json()) as StudyCore;
      if (version === refreshVersion)
        set({ ...nextCore, members: withStats(nextCore.members, get().memberStats) });
      await refreshDetail();
    };

    // 요청마다 버전을 올리고 가장 최근 요청의 응답만 반영한다.
    // 먼저 보낸 요청이 나중에 도착해도 새 저장 결과를 덮어쓰지 않는다.
    const refreshDetail = async () => {
      const partyId = get().party?.id;
      if (!partyId || get().mode === "demo") return;
      const version = ++detailVersion;
      try {
        const response = await fetch(
          `/api/study/detail?partyId=${encodeURIComponent(partyId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("study_detail_failed");
        const next = (await response.json()) as StudyDetail;
        if (version !== detailVersion) return;
        set({
          ...next,
          members: withStats(get().members, next.memberStats),
          detailReady: true,
          detailError: false,
        });
      } catch (error) {
        if (version === detailVersion) set({ detailError: true });
        throw error;
      }
    };

    const save = async (input: StudyInput) => {
      const partyId = get().party?.id;
      if (!partyId || get().saving) return false;
      set({ saving: true });
      try {
        await requestJson("/api/study", { ...input, partyId });
      } catch (error) {
        const message = input.action === "ask-ai"
          ? error instanceof HttpError && error.status === 503
            ? "AI 연결이 준비되지 않았어요. 파티원 댓글은 이용할 수 있어요"
            : error instanceof HttpError && error.status === 429
              ? "오늘 AI 질문 횟수를 모두 사용했어요. 내일 다시 질문해 주세요"
              : "AI 답변을 받지 못했어요. 입력한 내용으로 다시 시도해 주세요"
          : "저장하지 못했어요. 잠시 후 다시 시도해 주세요";
        useToast.getState().flash(message);
        set({ saving: false });
        return false;
      }
      // 저장과 조회 실패는 구분한다. 조회만 실패했을 때 중복 저장을 유도하지 않는다.
      try {
        await refresh();
      } catch {
        useToast
          .getState()
          .flash("저장됐지만 화면을 갱신하지 못했어요. 새로고침해 주세요");
      }
      set({ saving: false });
      return true;
    };
    return {
      ...core,
      ...data,
      members: withStats(core.members, data.memberStats),
      detailReady: detail !== null,
      detailError: false,
      modal: null,
      uploadSelection: TASKS.find((t) => !core.done[t.id])?.id ?? TASKS[0].id,
      questionDraft: null,
      saving: false,
      refresh,
      loadDetail: async () => {
        if (get().detailReady) return;
        // 실패 상태는 refreshDetail이 기록하고, 다음 30초 갱신이 다시 시도한다
        await refreshDetail().catch(() => {});
      },
      openUpload: (category) => {
        set({
          modal: "upload",
          uploadSelection:
            category ?? TASKS.find((t) => !get().done[t.id])?.id ?? TASKS[0].id,
        });
      },
      selectUpload: (category) => {
        set({ uploadSelection: category });
      },
      openScore: () => set({ modal: "score" }),
      openQuestion: (draft) => set({ modal: "question", questionDraft: draft ?? null }),
      closeModal: () => set({ modal: null, questionDraft: null }),
      completeTask: (category) =>
        set((s) => ({ done: { ...s.done, [category]: true } })),
      addScore: async (lc, rc, label) => {
        if (get().mode === "live") {
          if (!(await save({ action: "score", lc, rc }))) return false;
        } else
          set((s) => ({ scores: [...s.scores, { label, value: lc + rc }] }));
        set({ modal: null });
        return true;
      },
      cheerLog: async (logId) => save({ action: "cheer", logId }),
      cheerFeed: async (index) => {
        if (get().mode === "live") return get().cheerLog(get().feed[index].id);
        set((s) => ({
          feedCheers: s.feedCheers.map((c, i) => (i === index ? c + 1 : c)),
        }));
        return true;
      },
      nudge: async (memberId) => {
        if (get().mode === "live") return save({ action: "nudge", memberId });
        set((s) => ({ nudgedIds: [...new Set([...s.nudgedIds, memberId])] }));
        return true;
      },
      finishQuiz: async (score, answers) => {
        if (get().mode === "live") return save({ action: "quiz", answers });
        set((s) => ({ quizScore: score, done: { ...s.done, word: true } }));
        return true;
      },
      askAi: async (threadId, prompt) => {
        if (get().mode !== "live") {
          useToast.getState().flash("파티에 로그인하면 AI에게 질문할 수 있어요");
          return false;
        }
        return save({ action: "ask-ai", threadId, prompt });
      },
      addReply: async (threadId, text) => {
        if (get().mode === "live")
          return save({ action: "reply", threadId, text });
        const me = get().me;
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  replies: [
                    ...t.replies,
                    { initial: me.initial, name: me.name, text },
                  ],
                }
              : t,
          ),
        }));
        return true;
      },
      confirmAi: async (threadId, turnId, confirmed) => {
        if (get().mode === "live")
          return save({ action: "confirm-ai", threadId, turnId, confirmed });
        const me = get().me;
        const toggle = (people: { id: string; name: string }[] = []) => {
          const others = people.filter((p) => p.id !== me.id);
          return confirmed ? [...others, { id: me.id, name: me.name }] : others;
        };
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id !== threadId
              ? t
              : turnId === null
                ? { ...t, aiConfirmedBy: toggle(t.aiConfirmedBy) }
                : {
                    ...t,
                    aiTurns: t.aiTurns?.map((turn) =>
                      turn.id === turnId
                        ? { ...turn, confirmedBy: toggle(turn.confirmedBy) }
                        : turn,
                    ),
                  },
          ),
        }));
        return true;
      },
      saveQuestion: async (tag, title) => {
        if (!(await save({ action: "question", tag, title }))) return null;
        set({ modal: null });
        // 질문은 최신순이라 같은 제목 중 맨 앞이 방금 올린 질문이다.
        // 저장은 됐는데 목록 갱신이 늦어 못 찾으면 빈 문자열(목록으로 이동)을 돌려준다.
        const saved = title.trim();
        return get().threads.find((t) => t.title === saved)?.id ?? "";
      },
      addThread: (thread) =>
        set((s) => ({ threads: [thread, ...s.threads], modal: null })),
    };
  });
}
export type StudyStore = ReturnType<typeof createStudyStore>;
export const StudyStoreContext = createContext<StudyStore | null>(null);
export function useStudyStore<T>(selector: (state: StudyState) => T): T {
  const store = useContext(StudyStoreContext);
  if (!store) throw new Error("StudyProvider is missing");
  return useStore(store, selector);
}
export function useDoneCount() {
  return useStudyStore((s) => Object.values(s.done).filter(Boolean).length);
}
export function useLatestScore() {
  return useStudyStore((s) => s.scores.at(-1)?.value ?? null);
}
export function useModal(name: Exclude<Modal, null>) {
  const open = useStudyStore((s) => s.modal === name);
  const close = useStudyStore((s) => s.closeModal);
  return { open, close, onOpenChange: (next: boolean) => !next && close() };
}
