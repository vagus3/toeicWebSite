"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ReportRowsTable } from "@/features/quiz/report-rows-table";
import { EvidenceFull, EvidenceThumb, evidenceUrl } from "@/features/study/evidence-photo";
import { TASKS } from "@/lib/demo-data";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useStudyStore } from "@/stores/study-store";
import { STUDY_CATEGORIES, type Member, type StudyCategory } from "@/types";
import { isRecordsMonth, shiftRecordsMonth, type RecordItem } from "./records-schema";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const SELECT = "rounded-md border border-divider bg-surface px-2 py-1.5 text-meta";

function categoryLabel(category: StudyCategory) {
  return TASKS.find((t) => t.id === category)?.short ?? category;
}
function dayLabel(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DOW[d.getDay()]})`;
}
function monthLabel(month: string) {
  const [year, m] = month.split("-");
  return `${year}년 ${Number(m)}월`;
}

/** 데모 모드에서 화면 구성을 보여주기 위한 예시 기록 */
function demoRecords(members: Member[], studyDate: string): RecordItem[] {
  const categories: StudyCategory[] = ["rc", "word", "lc", "book"];
  return members.slice(0, 4).map((m, i) => ({
    id: `demo-${m.id}`,
    userId: m.id,
    category: categories[i],
    studyDate: i < 2 ? studyDate : `${studyDate.slice(0, 8)}01`,
    createdAt: studyDate,
    report:
      i === 0
        ? {
            id: "demo-report",
            category: "rc",
            total: 3,
            correct: 2,
            testDate: studyDate,
            rows: [
              { number: 1, selected: "A", correctAnswer: "A", result: "correct" },
              { number: 2, selected: "B", correctAnswer: "C", result: "incorrect" },
              { number: 3, selected: "D", correctAnswer: "D", result: "correct" },
            ],
          }
        : null,
  }));
}

function RecordDetail({ item, name, demo, mine }: { item: RecordItem; name: string; demo: boolean; mine: boolean }) {
  const label = categoryLabel(item.category);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-title font-medium">
          {name} · {label}
        </span>
        <span className="tag tag-neutral">{dayLabel(item.studyDate)}</span>
      </div>
      {demo ? (
        <div className="photo-placeholder grid h-feed-photo place-items-center rounded-md">
          <span className="text-caption text-muted">인증 사진</span>
        </div>
      ) : (
        <EvidenceFull src={evidenceUrl(item.id)} alt={`${name}님의 ${label} 인증 사진`} />
      )}
      {item.report && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-meta">
            <b className="font-medium">해커스 {item.report.category.toUpperCase()} 채점표</b>
            <span className="tag tag-accent">
              {item.report.correct}/{item.report.total}
            </span>
            <span className="text-muted">문제 날짜 {item.report.testDate}</span>
          </div>
          <ReportRowsTable rows={item.report.rows} />
          {/* 오답노트는 본인만 볼 수 있어 내 기록에서만 연결한다 */}
          {mine && !demo && item.report.rows.some((r) => r.result === "incorrect") && (
            <Link href={ROUTES.review} className="text-meta text-accent underline">
              틀린 문제 오답노트에서 복습
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function RecordsBoardContent() {
  const params = useSearchParams();
  const mode = useStudyStore((s) => s.mode);
  const party = useStudyStore((s) => s.party);
  const members = useStudyStore((s) => s.members);
  const studyDate = useStudyStore((s) => s.studyDate);
  const meId = useStudyStore((s) => s.me.id);
  const isMobile = useIsMobile();
  const thisMonth = studyDate.slice(0, 7);
  const firstMonth = (party?.createdAt ?? studyDate).slice(0, 7);
  const initialMonth = params.get("month");
  const initialMember = params.get("memberId");
  const initialCategory = params.get("category");
  // 트래커 칸 상세의 "기록에서 보기"는 멤버와 월을 쿼리로 넘긴다
  const [month, setMonth] = useState(
    isRecordsMonth(initialMonth) && initialMonth <= thisMonth ? initialMonth : thisMonth,
  );
  const [memberId, setMemberId] = useState(
    members.some((m) => m.id === initialMember) ? initialMember! : "",
  );
  const [category, setCategory] = useState<StudyCategory | "">(
    STUDY_CATEGORIES.find((c) => c === initialCategory) ?? "",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const live = mode === "live" && Boolean(party);
  const records = useQuery({
    queryKey: ["records", party?.id, month, memberId, category],
    enabled: live,
    queryFn: async (): Promise<{ records: RecordItem[] }> => {
      const query = new URLSearchParams({ partyId: party!.id, month });
      if (memberId) query.set("memberId", memberId);
      if (category) query.set("category", category);
      const response = await fetch(`/api/study/records?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("records_failed");
      return response.json();
    },
  });
  const items = live
    ? (records.data?.records ?? [])
    : demoRecords(members, studyDate).filter(
        (r) => (!memberId || r.userId === memberId) && (!category || r.category === category),
      );
  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (userId: string) => names.get(userId) ?? "파티원";
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const days = [...new Set(items.map((i) => i.studyDate))];
  const changeMonth = (delta: number) => {
    setMonth(shiftRecordsMonth(month, delta));
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>인증 기록</PageTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="이전 달"
            disabled={month <= firstMonth}
            onClick={() => changeMonth(-1)}
          >
            <CaretLeft />
          </Button>
          <span className="min-w-24 text-center text-body font-medium">{monthLabel(month)}</span>
          <Button
            variant="secondary"
            size="icon"
            aria-label="다음 달"
            disabled={month >= thisMonth}
            onClick={() => changeMonth(1)}
          >
            <CaretRight />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="멤버"
          className={SELECT}
          value={memberId}
          onChange={(e) => {
            setMemberId(e.target.value);
            setSelectedId(null);
          }}
        >
          <option value="">전체 멤버</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.isMe ? `${m.name} (나)` : m.name}
            </option>
          ))}
        </select>
        {(["", ...STUDY_CATEGORIES] as const).map((c) => (
          <button
            key={c || "all"}
            type="button"
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setSelectedId(null);
            }}
            className={cn("tag cursor-pointer", category === c ? "tag-accent" : "tag-outline")}
          >
            {c ? categoryLabel(c) : "전체"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <section aria-label="인증 사진 목록" className="flex min-w-0 flex-1 basis-col-main flex-col gap-5">
          {live && records.isPending ? (
            <p role="status" className="text-muted">기록 불러오는 중…</p>
          ) : live && records.isError ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-muted">기록을 불러오지 못했어요.</p>
              <Button variant="secondary" onClick={() => records.refetch()}>
                다시 불러오기
              </Button>
            </div>
          ) : !items.length ? (
            <p className="text-muted">이 달에 올린 인증 사진이 없어요.</p>
          ) : (
            days.map((day) => (
              <div key={day} className="flex flex-col gap-2">
                <h2 className="m-0 text-meta font-medium text-muted">{dayLabel(day)}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items
                    .filter((i) => i.studyDate === day)
                    .map((item) => {
                      const label = categoryLabel(item.category);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={item.id === selectedId}
                          aria-label={`${nameOf(item.userId)} ${label} 인증 보기`}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            "card flex cursor-pointer flex-col gap-2 p-2 text-left",
                            item.id === selectedId && "shadow-ring-selected",
                          )}
                        >
                          {live ? (
                            <EvidenceThumb
                              src={evidenceUrl(item.id)}
                              alt={`${nameOf(item.userId)}님의 ${label} 인증 사진`}
                              className="aspect-square w-full"
                            />
                          ) : (
                            <div className="photo-placeholder grid aspect-square w-full place-items-center rounded-md">
                              <span className="text-caption text-muted">인증 사진</span>
                            </div>
                          )}
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="tag tag-neutral">{label}</span>
                            {item.report && (
                              <span className="tag tag-accent">
                                {item.report.correct}/{item.report.total}
                              </span>
                            )}
                          </span>
                          <span className="text-meta">{nameOf(item.userId)}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </section>

        {!isMobile && (
          <aside
            aria-label="선택한 인증 상세"
            className="card elev-sm sticky top-8 min-w-col-aside-min shrink basis-col-detail gap-3 p-4"
          >
            {selected ? (
              <RecordDetail item={selected} name={nameOf(selected.userId)} demo={!live} mine={selected.userId === meId} />
            ) : (
              <p className="text-meta text-muted">사진을 고르면 크게 보고 채점 결과도 확인할 수 있어요.</p>
            )}
          </aside>
        )}
      </div>

      {isMobile && (
        <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
          <DialogContent className="w-full max-w-3xl" closeLabel="닫기">
            <DialogTitle className="sr-only">선택한 인증 상세</DialogTitle>
            {selected && (
              <RecordDetail item={selected} name={nameOf(selected.userId)} demo={!live} mine={selected.userId === meId} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function RecordsBoard() {
  return (
    <Suspense>
      <RecordsBoardContent />
    </Suspense>
  );
}
