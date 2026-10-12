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
  hackersWord: "/quizzes/hackers/word",
  dailyQuiz: "/quizzes/daily",
  review: "/quizzes/review",
  qna: "/qna",
  upload: "/study/upload",
  chat: (partyId: string = PARTY.id, roomId: string = PARTY.defaultChatRoomId) =>
    `/party/${partyId}/chat/${roomId}`,
} as const;
