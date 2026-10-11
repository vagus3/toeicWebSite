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

export interface StudySnapshot {
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
  logs: StudyLog[];
  done: Record<StudyCategory, boolean>;
  scores: ScoreEntry[];
  feed: FeedItem[];
  feedCheers: number[];
  nudgedIds: string[];
  threads: QnaThread[];
  quizScore: number | null;
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
