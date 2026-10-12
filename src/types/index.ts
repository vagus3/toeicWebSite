export const STUDY_CATEGORIES = ["word", "lc", "rc", "book"] as const;
export type StudyCategory = (typeof STUDY_CATEGORIES)[number];
export const SCORE_TRACKS = ["700", "800", "900+"] as const;
export type ScoreTrack = (typeof SCORE_TRACKS)[number];

export interface StudyTask {
  id: StudyCategory;
  /** 카드 상단 라벨 (단어, LC, RC, 교재) */
  short: string;
  /** 카드 가운데 큰 글자 (50개, 15문제, Ch.9) */
  big: string;
  /** 데스크톱 카드 하단 설명 */
  sub: string;
  /** 모바일 리스트 라벨 (단어 50개 …) */
  label: string;
  /** 모바일 리스트 하단 설명 */
  mobileSub: string;
}

export interface Party {
  id: string;
  name: string;
  brand: string;
  capacity: number;
  examLabel: string;
  examDate: Date;
  driveRoot: string;
  inviteUrl: string;
  defaultChatRoomId: string;
}

export interface Member {
  id: string;
  name: string;
  initial: string;
  track: ScoreTrack;
  quota: number;
  book: { done: number; total: number };
  score: number | null;
  streak: number;
  /** 트래커 데모 데이터 생성용 평균 학습 강도 (0–4) */
  baseline: number;
  isMe?: boolean;
}

export interface FeedItem {
  id: string;
  initial: string;
  name: string;
  what: string;
  photo: boolean;
  photoUrl?: string;
  body: string;
}

export interface ScoreEntry {
  label: string;
  value: number;
}

export interface QnaReply {
  initial: string;
  name: string;
  text: string;
}

export interface QnaAiTurn {
  id: string;
  name: string;
  prompt: string;
  answer: string;
}

export interface QnaThread {
  id: string;
  tag: string;
  who: string;
  title: string;
  ai: string;
  replies: QnaReply[];
  aiTurns?: QnaAiTurn[];
}

export interface QuizQuestion {
  text: string;
  opts: string[];
  answer: number;
  why: string;
}

/** text: 일반 메시지·@AI 질문, ai: AI 답변, system: 인증 알림·AI 실패 안내 */
export type ChatMessageKind = "text" | "ai" | "system";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  initial: string;
  content: string;
  createdAt: string;
  kind: ChatMessageKind;
  /** AI 답변·실패 안내가 가리키는 @AI 질문 */
  replyTo: string | null;
  /** 인증 알림이 가리키는 학습 기록 — 축하에 쓴다 */
  logId: string | null;
  /** AI 답변을 확인한 파티원 */
  confirmedBy: { id: string; name: string }[];
  /** 인증 알림을 축하한 파티원 id */
  cheeredBy: string[];
}
