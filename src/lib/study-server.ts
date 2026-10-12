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
  EMPTY_MEMBER_STATS,
  koreaStudyDate,
  type StudyCore,
  type StudyDetail,
  type StudyLog,
  type StudySnapshot,
} from "./study-model";
import { examLabel, toStudyDate } from "./utils";

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
    done: { word: true, lc: true, rc: false, book: false },
    nudgedIds: [],
    detail: {
      memberStats: Object.fromEntries(
        MEMBERS.map((m) => [m.id, { book: m.book, score: m.score, streak: m.streak }]),
      ),
      logs: [],
      scores: SCORES,
      feed: FEED,
      feedCheers: FEED_CHEERS,
      threads: THREADS,
      quizScore: null,
    },
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

/**
 * 모든 페이지의 첫 렌더에 필요한 가벼운 데이터만 읽는다.
 * 기록 전체·질문·점수 이력은 loadStudyDetail이 담당하므로 레이아웃을 막지 않는다.
 */
export async function loadStudyCore(
  supabase: SupabaseClient,
  userId: string,
  preferredParty?: string | null,
): Promise<StudyCore> {
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
  const base = {
    mode: "live" as const,
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
    done: { word: false, lc: false, rc: false, book: false },
    nudgedIds: [],
  };
  if (!party) return base;
  const [memberResult, todayLogs, roomResult, nudgeResult, inviteResult] =
    await Promise.all([
      supabase
        .from("party_members")
        .select("user_id, profiles(id, nickname, track)")
        .eq("party_id", party.id)
        .order("joined_at"),
      // 오늘 기록도 PostgREST 1,000행 제한에 걸리지 않도록 페이지 단위로 읽는다
      readAll((from, to) =>
        supabase
          .from("study_logs")
          .select("id, user_id, category, study_date, amount")
          .eq("party_id", party.id)
          .eq("study_date", studyDate)
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
  const profiles = (memberResult.data ?? [])
    .map((m) => m.profiles as unknown as {
      id: string;
      nickname: string;
      track: "700" | "800" | "900+";
    })
    .filter(Boolean);
  const members = profiles.map((p) => ({
    id: p.id,
    name: p.nickname,
    initial: p.nickname.slice(0, 1),
    track: p.track ?? "800",
    quota: Object.values(completedCategories(todayLogs, p.id, studyDate)).filter(Boolean).length * 25,
    ...EMPTY_MEMBER_STATS,
    baseline: 0,
    isMe: p.id === userId,
  }));
  return {
    ...base,
    party: {
      id: party.id,
      name: party.name,
      brand: "새벽 토익",
      capacity: party.capacity,
      examDate: party.exam_date,
      examLabel: examLabel(party.exam_date),
      driveRoot: party.name,
      inviteUrl: `/invite/${inviteResult.data}`,
      defaultChatRoomId: roomResult.data?.id ?? "",
      createdAt: party.created_at,
    },
    members,
    done: completedCategories(todayLogs, userId, studyDate),
    nudgedIds: (nudgeResult.data ?? []).map((n) => n.receiver_id),
  };
}

/** 피드·Q&A·점수·트래커 등 파티 전체 기록을 읽는다. 페이지가 필요할 때만 호출된다. */
export async function loadStudyDetail(
  supabase: SupabaseClient,
  userId: string,
  partyId: string,
): Promise<StudyDetail> {
  const studyDate = koreaStudyDate();
  const [memberResult, logs, attempts, questions] = await Promise.all([
    supabase
      .from("party_members")
      .select("user_id, profiles(id, nickname, track)")
      .eq("party_id", partyId)
      .order("joined_at"),
    readAll((from, to) =>
      supabase
        .from("study_logs")
        .select(
          "id, user_id, category, study_date, amount, study_evidences(id)",
        )
        .eq("party_id", partyId)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("quiz_attempts")
        .select("user_id, kind, score, taken_on, created_at")
        .eq("party_id", partyId)
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase
        .from("questions")
        // AI 대화는 외래 키 이름으로 콕 집는다. 확인 표(question_ai_confirmations)도 질문과 AI 대화를
        // 함께 참조해서, 이름만 쓰면 PostgREST가 관계를 하나로 고르지 못할 수 있다.
        .select(
          "id, user_id, tag, title, ai_answer, created_at, question_replies(id, user_id, body, created_at), question_ai_turns!question_ai_turns_question_id_fkey(id, user_id, prompt, answer, created_at), question_ai_confirmations(user_id, turn_id)",
        )
        .eq("party_id", partyId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);
  if (memberResult.error) throw new Error("study_load_failed");
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
  const memberStats = Object.fromEntries(
    profiles.map((p) => {
      const scores = attempts.filter(
        (a) => a.user_id === p.id && a.kind !== "daily",
      );
      const bookDays = new Set(
        studyLogs
          .filter((l) => l.user_id === p.id && l.category === "book")
          .map((l) => l.study_date),
      ).size;
      return [
        p.id,
        {
          // 교재 목표(쪽수·일수)는 DB에 없다. 0이면 화면은 "N일"로만 보여 준다.
          book: { done: bookDays, total: 0 },
          score: scores.at(-1)?.score ?? null,
          streak: consecutiveDays(studyLogs, p.id, studyDate),
        },
      ];
    }),
  );
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
    memberStats,
    logs: studyLogs,
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
    threads: questions.map((q) => {
      const confirmations: { user_id: string; turn_id: string | null }[] =
        q.question_ai_confirmations ?? [];
      // turnId가 null이면 첫 AI 답변의 확인
      const confirmedBy = (turnId: string | null) =>
        confirmations
          .filter((c) => c.turn_id === turnId)
          .map((c) => ({ id: c.user_id, name: names.get(c.user_id) ?? "파티원" }));
      return {
        id: q.id,
        tag: q.tag,
        title: q.title,
        who: names.get(q.user_id) ?? "파티원",
        ai: q.ai_answer ?? "",
        aiConfirmedBy: confirmedBy(null),
        aiTurns: [...q.question_ai_turns]
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
          .map((turn) => ({
            id: turn.id,
            name: names.get(turn.user_id) ?? "파티원",
            prompt: turn.prompt,
            answer: turn.answer,
            confirmedBy: confirmedBy(turn.id),
          })),
        replies: [...q.question_replies]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((r) => ({
            name: names.get(r.user_id) ?? "파티원",
            initial: (names.get(r.user_id) ?? "파").slice(0, 1),
            text: r.body,
          })),
      };
    }),
  };
}
