"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { TASKS } from "@/lib/demo-data";
import { HttpError, requestJson } from "@/lib/http";
import type { StudySnapshot } from "@/lib/study-model";
import type { StudyAction } from "@/features/study/study-schema";
import { useToast } from "./toast-store";
import type { QnaThread, StudyCategory } from "@/types";

type StudyInput<T = StudyAction> = T extends StudyAction
  ? Omit<T, "partyId">
  : never;

export type Modal = "upload" | "score" | "question" | null;
interface StudyState extends StudySnapshot {
  modal: Modal;
  uploadSelection: StudyCategory | null;
  activeThreadId: string;
  saving: boolean;
  openUpload: (category?: StudyCategory) => void;
  selectUpload: (category: StudyCategory) => void;
  openScore: () => void;
  openQuestion: () => void;
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
  saveQuestion: (
    tag: Extract<StudyAction, { action: "question" }>["tag"],
    title: string,
  ) => Promise<boolean>;
  setActiveThread: (id: string) => void;
  refresh: () => Promise<void>;
}

// 요청마다 새 스토어를 만든다. 서버 렌더링 중 사용자의 상태가 서로 섞이지 않는다.
export function createStudyStore(initial: StudySnapshot) {
  return createStore<StudyState>()((set, get) => {
    let refreshVersion = 0;
    const refresh = async () => {
      if (get().mode === "demo") return;
      const version = ++refreshVersion;
      const response = await fetch(
        `/api/study?partyId=${encodeURIComponent(get().party?.id ?? "")}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("study_load_failed");
      const snapshot = (await response.json()) as StudySnapshot;
      if (version === refreshVersion) set(snapshot);
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
      ...initial,
      modal: null,
      uploadSelection: TASKS.find((t) => !initial.done[t.id])?.id ?? TASKS[0].id,
      activeThreadId: initial.threads[0]?.id ?? "",
      saving: false,
      refresh,
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
      openQuestion: () => set({ modal: "question" }),
      closeModal: () => set({ modal: null }),
      setActiveThread: (activeThreadId) => set({ activeThreadId }),
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
      saveQuestion: async (tag, title) => {
        if (!(await save({ action: "question", tag, title }))) return false;
        set({ modal: null, activeThreadId: get().threads[0]?.id ?? "" });
        return true;
      },
      addThread: (thread) =>
        set((s) => ({
          threads: [thread, ...s.threads],
          activeThreadId: thread.id,
          modal: null,
        })),
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
