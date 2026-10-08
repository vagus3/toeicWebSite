/**
 * Claude Design 시안의 데모 데이터.
 * Supabase 연결 전까지 화면이 그대로 동작하도록 같은 값을 쓴다.
 */
import type {
  ChatMessage,
  FeedItem,
  Member,
  Party,
  QnaThread,
  QuizQuestion,
  ScoreEntry,
  StudyTask,
} from "@/types";

/** 시안 기준 "오늘" — 10/8 인증, 10/25 정기시험 D-17 */
export const DEMO_TODAY = new Date(2026, 9, 8);
/** 트래커에서 이동 가능한 첫 달 (2026년 8월) */
export const TRACKER_START = { year: 2026, month: 7 };

export const PARTY: Party = {
  id: "dawn-4",
  name: "새벽 토익 4인방",
  brand: "새벽 토익",
  capacity: 6,
  examLabel: "10/25(일) 정기시험",
  examDate: new Date(2026, 9, 25),
  driveRoot: "새벽토익",
  inviteUrl: "https://toeic-study.vercel.app/invite/dawn-4",
  defaultChatRoomId: "general",
};

export const ME = {
  id: "hyeonggyu",
  name: "형규",
  initial: "형",
  track: "800" as const,
  target: 800,
  inviter: "형규",
};

export const TASKS: StudyTask[] = [
  {
    id: "word",
    short: "단어",
    big: "50개",
    sub: "Day 12 · 일일 테스트",
    label: "단어 50개",
    mobileSub: "Day 12 · 일일 테스트",
  },
  {
    id: "lc",
    short: "LC",
    big: "15문제",
    sub: "Part 3 · 12/15",
    label: "LC 15문제",
    mobileSub: "Part 3 · 12/15",
  },
  {
    id: "rc",
    short: "RC",
    big: "15문제",
    sub: "Part 5–6",
    label: "RC 15문제",
    mobileSub: "Part 5–6",
  },
  {
    id: "book",
    short: "교재",
    big: "Ch.9",
    sub: "해커스 RC · p.212–236",
    label: "교재 Ch.9 · p.212–236",
    mobileSub: "해커스 RC · 9/24",
  },
];

export const MEMBERS: Member[] = [
  {
    id: "jihyun",
    name: "지현",
    initial: "지",
    track: "900+",
    quota: 96,
    book: { done: 17, total: 24 },
    score: 880,
    streak: 21,
    baseline: 3.6,
  },
  {
    id: "hyeonggyu",
    name: "형규",
    initial: "형",
    track: "800",
    quota: 78,
    book: { done: 9, total: 24 },
    score: 725,
    streak: 6,
    baseline: 2.9,
    isMe: true,
  },
  {
    id: "seoyeon",
    name: "서연",
    initial: "서",
    track: "800",
    quota: 61,
    book: { done: 10, total: 24 },
    score: 740,
    streak: 3,
    baseline: 2.3,
  },
  {
    id: "minsu",
    name: "민수",
    initial: "민",
    track: "700",
    quota: 29,
    book: { done: 4, total: 20 },
    score: null,
    streak: 0,
    baseline: 1.4,
  },
];

export const FEED: FeedItem[] = [
  { id: "f1", initial: "지", name: "지현", what: "RC 50문제 인증 · 06:12", photo: true, body: "" },
  {
    id: "f2",
    initial: "서",
    name: "서연",
    what: "주간 테스트 +45점",
    photo: false,
    body: "685 → 740",
  },
  {
    id: "f3",
    initial: "민",
    name: "민수",
    what: "질문 · LC Part 2",
    photo: false,
    body: "Why don’t you~ 나오면 무조건 제안이에요?",
  },
];
export const FEED_CHEERS = [3, 1, 2];

export const SCORES: ScoreEntry[] = [
  { label: "9/13", value: 655 },
  { label: "9/20", value: 685 },
  { label: "9/27", value: 700 },
  { label: "10/4", value: 725 },
];

export const QUIZ: QuizQuestion[] = [
  {
    text: "The company will ______ its new policy on remote work starting next month.",
    opts: ["implement", "implicate", "impose", "imply"],
    answer: 0,
    why: "implement a policy(정책을 시행하다)가 토익 빈출 결합이에요.",
  },
  {
    text: "All schedules are ______ to change without prior notice.",
    opts: ["subject", "subjected", "objective", "submit"],
    answer: 0,
    why: "be subject to change: ~될 수 있다. 형용사 subject가 와요.",
  },
  {
    text: "Please ______ the attached form by Friday.",
    opts: ["complete", "compete", "compile", "comply"],
    answer: 0,
    why: "complete a form(양식을 작성하다). comply는 with가 필요해요.",
  },
];

export const THREADS: QnaThread[] = [
  {
    id: "t1",
    tag: "RC Part 5",
    who: "서연 · 08:40",
    title: "“be subject to”랑 “be subjected to” 차이가 뭐예요? 교재 p.148 23번",
    ai: "be subject to + 명사는 “~의 대상이다, ~하기 쉽다”(형용사적). be subjected to는 “~을 당하다”(수동). 23번은 일정 변경 가능성을 말하니 subject to가 맞아요.",
    replies: [
      {
        initial: "지",
        name: "지현",
        text: "토익에선 subject to change / approval 덩어리로 외우면 Part 5에서 바로 풀림",
      },
    ],
  },
  {
    id: "t2",
    tag: "LC Part 2",
    who: "민수 · 어제",
    title: "Why don’t you~ 나오면 무조건 제안이에요?",
    ai: "대부분 제안이지만, 이유를 묻는 맥락이면 진짜 “왜”일 수 있어요. 응답 보기에 Sure / That’s a good idea가 있으면 제안이에요.",
    replies: [{ initial: "형", name: "형규", text: "해커스 Ch.3 p.54에 정리돼있음" }],
  },
  {
    id: "t3",
    tag: "단어",
    who: "형규 · 10/6",
    title: "implement / impose 구분법",
    ai: "implement는 계획·정책을 “실행”, impose는 세금·규제를 “부과”. impose a fine, implement a plan처럼 목적어로 구분해요.",
    replies: [],
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    roomId: "general",
    senderId: "seoyeon",
    senderName: "서연",
    initial: "서",
    content: "주간 테스트 740 나왔어요! 다음 주엔 750 넘겨볼게요",
    createdAt: "2026-10-08T06:40:00+09:00",
  },
  {
    id: "m2",
    roomId: "general",
    senderId: "hyeonggyu",
    senderName: "형규",
    initial: "형",
    content: "축하해요! 저는 RC Part 5 아직 남음…",
    createdAt: "2026-10-08T06:52:00+09:00",
  },
  {
    id: "m3",
    roomId: "general",
    senderId: "jihyun",
    senderName: "지현",
    initial: "지",
    content: "오늘 LC 몇 문제 풀었어? 다들 인증 ㄱㄱ",
    createdAt: "2026-10-08T07:05:00+09:00",
  },
];

/** 트래커 데모용 결정적 난수 — 시안의 lvl()과 동일한 식 */
export function demoLevel(memberIndex: number, year: number, month: number, day: number) {
  const x = Math.sin((memberIndex + 1) * 9301 + year * 49297 + month * 233 + day * 131) * 10000;
  const f = x - Math.floor(x);
  return Math.max(0, Math.min(4, Math.round(MEMBERS[memberIndex].baseline + (f - 0.5) * 3)));
}
