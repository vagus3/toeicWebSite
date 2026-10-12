import { PARTY } from "@/lib/demo-data";

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  tracker: "/tracker",
  records: "/records",
  quizzes: "/quizzes",
  hackersLc: "/quizzes/hackers/lc",
  hackersRc: "/quizzes/hackers",
  dailyRc: "/quizzes/rc",
  dailyQuiz: "/quizzes/daily",
  review: "/quizzes/review",
  /** 오답노트 한 문제씩 다시 풀기 (?source=로 출처를 고른다) */
  reviewRetry: "/quizzes/review/retry",
  qna: "/qna",
  qnaThread: (threadId: string) => `/qna/${threadId}`,
  upload: "/study/upload",
  /** 내 메뉴 — 프로필·파티·Drive·알림·화면·로그아웃 */
  me: "/me",
  chat: (partyId: string = PARTY.id, roomId: string = PARTY.defaultChatRoomId) =>
    `/party/${partyId}/chat/${roomId}`,
} as const;
