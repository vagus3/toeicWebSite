import { PARTY } from "@/lib/demo-data";

export const ROUTES = {
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  tracker: "/tracker",
  quizzes: "/quizzes",
  dailyRc: "/quizzes/rc",
  dailyQuiz: "/quizzes/daily",
  qna: "/qna",
  upload: "/study/upload",
  chat: (partyId: string = PARTY.id, roomId: string = PARTY.defaultChatRoomId) =>
    `/party/${partyId}/chat/${roomId}`,
} as const;
