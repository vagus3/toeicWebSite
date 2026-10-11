import type {
  FeedItem,
  Member,
  Party,
  QnaThread,
  ScoreEntry,
  ScoreTrack,
  StudyCategory,
} from "@/types";

export interface StudyLog {
  id: string;
  user_id: string;
  category: StudyCategory;
  study_date: string;
  amount: number;
  study_evidences?: { id: string }[];
}

/** 멤버별 이력 통계. 전체 기록을 읽어야 계산되므로 상세 응답에만 들어 있다. */
export type MemberStats = Pick<Member, "book" | "score" | "streak">;

export const EMPTY_MEMBER_STATS: MemberStats = {
  book: { done: 0, total: 0 },
  score: null,
  streak: 0,
};

/**
 * 레이아웃이 첫 화면을 그리기 위해 blocking으로 읽는 가벼운 데이터.
 * members의 통계 필드는 상세가 도착하기 전까지 EMPTY_MEMBER_STATS 값이다.
 */
export interface StudyCore {
  mode: "demo" | "live";
  studyDate: string;
  me: {
    id: string;
    name: string;
    initial: string;
    track: ScoreTrack;
    target: number;
  };
  party:
    | (Omit<Party, "examDate"> & { examDate: string | null; createdAt: string })
    | null;
  parties: { id: string; name: string }[];
  members: Member[];
  done: Record<StudyCategory, boolean>;
  nudgedIds: string[];
}

/** 페이지가 필요할 때 따로 읽는 전체 파티 기록 */
export interface StudyDetail {
  memberStats: Record<string, MemberStats>;
  logs: StudyLog[];
  scores: ScoreEntry[];
  feed: FeedItem[];
  feedCheers: number[];
  threads: QnaThread[];
  quizScore: number | null;
}

export interface StudySnapshot extends StudyCore {
  /** 데모 모드는 처음부터 채워 두고, 실제 파티는 null로 시작해 클라이언트에서 불러온다 */
  detail: StudyDetail | null;
}

/** UTC 서버와 해외 기기에서도 동일한 한국 학습일을 사용한다. */
export function koreaStudyDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function completedCategories(
  logs: StudyLog[],
  userId: string,
  date: string,
) {
  const categories = new Set(
    logs
      .filter((l) => l.user_id === userId && l.study_date === date)
      .map((l) => l.category),
  );
  return {
    word: categories.has("word"),
    lc: categories.has("lc"),
    rc: categories.has("rc"),
    book: categories.has("book"),
  };
}

export function consecutiveDays(
  logs: StudyLog[],
  userId: string,
  today: string,
) {
  const dates = new Set(
    logs.filter((l) => l.user_id === userId).map((l) => l.study_date),
  );
  const cursor = new Date(`${today}T00:00:00Z`);
  let count = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}
