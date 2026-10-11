import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_TODAY,
  FEED,
  FEED_CHEERS,
  ME,
  MEMBERS,
  PARTY,
  SCORES,
  THREADS,
} from "@/lib/demo-data";
import {
  completedCategories,
  consecutiveDays,
  koreaStudyDate,
  type StudyLog,
  type StudySnapshot,
} from "./study-model";
import { toStudyDate } from "./utils";

export function demoSnapshot(): StudySnapshot {
  return {
    mode: "demo",
    studyDate: toStudyDate(DEMO_TODAY),
    me: ME,
    party: {
      ...PARTY,
      examDate: toStudyDate(PARTY.examDate),
      createdAt: "2026-08-01",
    },
    parties: [{ id: PARTY.id, name: PARTY.name }],
    members: MEMBERS,
    logs: [],
    done: { word: true, lc: true, rc: false, book: false },
    scores: SCORES,
    feed: FEED,
    feedCheers: FEED_CHEERS,
    nudgedIds: [],
    threads: THREADS,
    quizScore: null,
  };
}

/** PostgREST의 기본 1,000행 제한에 기록이 잘리지 않도록 페이지 단위로 읽는다. */
async function readAll<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await fetchPage(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function loadStudySnapshot(
  supabase: SupabaseClient,
  userId: string,
  preferredParty?: string | null,
): Promise<StudySnapshot> {
  const [profileResult, partyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, track, target_score")
      .eq("id", userId)
      .single(),
    supabase
      .from("parties")
      .select("id, name, capacity, exam_date, created_at")
      .order("created_at")
      .order("id"),
  ]);
  if (profileResult.error || partyResult.error)
    throw new Error("study_load_failed");
  const profile = profileResult.data;
  const parties = partyResult.data;
  const party = parties.find((p) => p.id === preferredParty) ?? parties[0];
  const studyDate = koreaStudyDate();
  const base: StudySnapshot = {
    mode: "live",
    studyDate,
    me: {
      id: userId,
      name: profile.nickname,
      initial: profile.nickname.slice(0, 1),
      track: profile.track ?? "800",
      target: profile.target_score ?? Number.parseInt(profile.track ?? "800"),
    },
    party: null,
    parties: parties.map(({ id, name }) => ({ id, name })),
    members: [],
    logs: [],
    done: { word: false, lc: false, rc: false, book: false },
    scores: [],
    feed: [],
    feedCheers: [],
    nudgedIds: [],
    threads: [],
    quizScore: null,
  };
  if (!party) return base;
  const [
    memberResult,
    logs,
    attempts,
    questions,
    roomResult,
    nudgeResult,
    inviteResult,
  ] = await Promise.all([
    supabase
      .from("party_members")
      .select("user_id, profiles(id, nickname, track)")
      .eq("party_id", party.id)
      .order("joined_at"),
    readAll((from, to) =>
      supabase
        .from("study_logs")
        .select(
          "id, user_id, category, study_date, amount, study_evidences(id)",
        )
        .eq("party_id", party.id)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("quiz_attempts")
        .select("user_id, kind, score, taken_on, created_at")
        .eq("party_id", party.id)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("questions")
        .select(
          "id, user_id, tag, title, ai_answer, created_at, question_replies(id, user_id, body, created_at)",
        )
        .eq("party_id", party.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("chat_rooms")
      .select("id")
      .eq("party_id", party.id)
      .eq("type", "party")
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("nudges")
      .select("receiver_id")
      .eq("party_id", party.id)
      .eq("sender_id", userId)
      .eq("nudge_date", studyDate),
    supabase.rpc("study_party_invite", { p_party: party.id }),
  ]);
  for (const result of [memberResult, roomResult, nudgeResult, inviteResult])
    if (result.error) throw new Error("study_load_failed");
  const studyLogs = logs as StudyLog[];
  const profiles = (memberResult.data ?? [])
    .map((m) => {
      const p = m.profiles as unknown as {
        id: string;
        nickname: string;
        track: "700" | "800" | "900+";
      };
      return p;
    })
    .filter(Boolean);
  const names = new Map(profiles.map((p) => [p.id, p.nickname]));
  const members = profiles.map((p) => {
    const done = completedCategories(studyLogs, p.id, studyDate);
    const scores = attempts.filter(
      (a) => a.user_id === p.id && a.kind !== "daily",
    );
    const bookDays = new Set(
      studyLogs
        .filter((l) => l.user_id === p.id && l.category === "book")
        .map((l) => l.study_date),
    ).size;
    return {
      id: p.id,
      name: p.nickname,
      initial: p.nickname.slice(0, 1),
      track: p.track ?? "800",
      quota: Object.values(done).filter(Boolean).length * 25,
      book: { done: bookDays, total: Math.max(24, bookDays) },
      score: scores.at(-1)?.score ?? null,
      streak: consecutiveDays(studyLogs, p.id, studyDate),
      baseline: 0,
      isMe: p.id === userId,
    };
  });
  const feedLogs = studyLogs.slice(-20).reverse();
  const feedIds = feedLogs.map((l) => l.id);
  const reactionResult = feedIds.length
    ? await supabase
        .from("reactions")
        .select("study_log_id")
        .in("study_log_id", feedIds)
        .eq("type", "cheer")
    : { data: [], error: null };
  if (reactionResult.error) throw new Error("study_load_failed");
  const daily = attempts.filter(
    (a) =>
      a.user_id === userId && a.kind === "daily" && a.taken_on === studyDate,
  );
  return {
    ...base,
    party: {
      id: party.id,
      name: party.name,
      brand: "새벽 토익",
      capacity: party.capacity,
      examDate: party.exam_date,
      examLabel: party.exam_date
        ? `${party.exam_date} 정기시험`
        : "시험일 미정",
      driveRoot: party.name,
      inviteUrl: `/invite/${inviteResult.data}`,
      defaultChatRoomId: roomResult.data?.id ?? "",
      createdAt: party.created_at,
    },
    members,
    logs: studyLogs,
    done: completedCategories(studyLogs, userId, studyDate),
    scores: attempts
      .filter((a) => a.user_id === userId && a.kind !== "daily")
      .map((a) => ({ label: a.taken_on, value: a.score })),
    quizScore: daily.at(-1)?.score ?? null,
    feed: feedLogs.map((l) => ({
      id: l.id,
      name: names.get(l.user_id) ?? "파티원",
      initial: (names.get(l.user_id) ?? "파").slice(0, 1),
      what: `${l.study_date} 학습 인증`,
      photo: Boolean(l.study_evidences?.length),
      photoUrl: l.study_evidences?.length
        ? `/api/study/evidence/${l.id}`
        : undefined,
      body: { word: "단어", lc: "LC", rc: "RC", book: "교재" }[l.category],
    })),
    feedCheers: feedLogs.map(
      (l) =>
        reactionResult.data?.filter((r) => r.study_log_id === l.id).length ?? 0,
    ),
    nudgedIds: (nudgeResult.data ?? []).map((n) => n.receiver_id),
    threads: questions.map((q) => ({
      id: q.id,
      tag: q.tag,
      title: q.title,
      who: names.get(q.user_id) ?? "파티원",
      ai: q.ai_answer ?? "파티원의 답변을 기다리고 있어요",
      replies: [...q.question_replies]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((r) => ({
          name: names.get(r.user_id) ?? "파티원",
          initial: (names.get(r.user_id) ?? "파").slice(0, 1),
          text: r.body,
        })),
    })),
  };
}
