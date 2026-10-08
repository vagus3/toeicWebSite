import { create } from "zustand";
import { FEED_CHEERS, ME, SCORES, TASKS, THREADS } from "@/lib/demo-data";
import type { QnaThread, ScoreEntry, StudyCategory } from "@/types";

export type Modal = "upload" | "score" | "question" | null;

interface StudyState {
  done: Record<StudyCategory, boolean>;
  scores: ScoreEntry[];
  feedCheers: number[];
  /** 오늘 콕 찌른 멤버 */
  nudgedIds: string[];
  threads: QnaThread[];
  activeThreadId: string;
  quizScore: number | null;

  modal: Modal;
  uploadSelection: StudyCategory | null;

  /** 인증 모달 열기 — 항목을 안 주면 아직 안 한 첫 항목을 고른다 */
  openUpload: (category?: StudyCategory) => void;
  selectUpload: (category: StudyCategory) => void;
  openScore: () => void;
  openQuestion: () => void;
  closeModal: () => void;

  completeTask: (category: StudyCategory) => void;
  addScore: (total: number, label: string) => void;
  cheerFeed: (index: number) => void;
  nudge: (memberId: string) => void;
  finishQuiz: (score: number) => void;
  addReply: (threadId: string, text: string) => void;
  addThread: (thread: QnaThread) => void;
  setActiveThread: (id: string) => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  done: { word: true, lc: true, rc: false, book: false },
  scores: SCORES,
  feedCheers: FEED_CHEERS,
  nudgedIds: [],
  threads: THREADS,
  activeThreadId: THREADS[0].id,
  quizScore: null,

  modal: null,
  uploadSelection: "rc",

  openUpload: (category) => {
    const { done } = get();
    if (category && done[category]) return;
    const next = category ?? TASKS.find((t) => !done[t.id])?.id ?? null;
    set({ modal: "upload", uploadSelection: next });
  },
  selectUpload: (category) => {
    if (get().done[category]) return;
    set({ uploadSelection: category });
  },
  openScore: () => set({ modal: "score" }),
  openQuestion: () => set({ modal: "question" }),
  closeModal: () => set({ modal: null }),

  completeTask: (category) => set((s) => ({ done: { ...s.done, [category]: true } })),
  addScore: (total, label) =>
    set((s) => ({ scores: [...s.scores, { label, value: total }], modal: null })),
  cheerFeed: (index) =>
    set((s) => ({ feedCheers: s.feedCheers.map((c, i) => (i === index ? c + 1 : c)) })),
  nudge: (memberId) =>
    set((s) => (s.nudgedIds.includes(memberId) ? s : { nudgedIds: [...s.nudgedIds, memberId] })),
  finishQuiz: (score) => set((s) => ({ quizScore: score, done: { ...s.done, word: true } })),
  addReply: (threadId, text) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, replies: [...t.replies, { initial: ME.initial, name: ME.name, text }] }
          : t,
      ),
    })),
  addThread: (thread) =>
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: thread.id, modal: null })),
  setActiveThread: (id) => set({ activeThreadId: id }),
}));

export function useDoneCount() {
  return useStudyStore((s) => Object.values(s.done).filter(Boolean).length);
}

export function useLatestScore() {
  return useStudyStore((s) => s.scores[s.scores.length - 1]?.value ?? null);
}

/** 다이얼로그 열림 상태 + Radix onOpenChange 연결 */
export function useModal(name: Exclude<Modal, null>) {
  const open = useStudyStore((s) => s.modal === name);
  const close = useStudyStore((s) => s.closeModal);
  return { open, close, onOpenChange: (next: boolean) => !next && close() };
}
