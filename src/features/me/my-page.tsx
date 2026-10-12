"use client";

import {
  CaretRight,
  ChatsCircle,
  DeviceMobile,
  Images,
  Notebook,
  SignOut,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { Avatar } from "@/components/shared/avatar";
import { PageTitle } from "@/components/shared/page-title";
import { SectionTitle } from "@/components/shared/section-title";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { PushToggle } from "@/features/chat/push-toggle";
import { NewPartyButton, PartyList } from "@/features/party/party-setup";
import { usePartySummary } from "@/features/party/use-party";
import {
  reopenInstallGuide,
  useCanReopenInstallGuide,
} from "@/features/pwa/install-state";
import { useReviewItems } from "@/features/review/use-review";
import { useCopyInvite, useLogout } from "@/features/shell/shell-actions";
import { DriveControls } from "@/features/study/drive-controls";
import { ROUTES } from "@/lib/routes";
import { useStudyStore } from "@/stores/study-store";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

function ShortcutRow({
  href,
  icon: IconComponent,
  label,
  badge,
}: {
  href: string;
  icon: Icon;
  label: string;
  badge?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 py-3 text-body text-text no-underline"
      >
        <IconComponent className="text-icon-md text-muted" />
        <span className="flex-1">{label}</span>
        {badge && <span className="tag tag-accent">{badge}</span>}
        <CaretRight aria-hidden className="text-muted" />
      </Link>
    </li>
  );
}

/** 내 메뉴 — 모바일 헤더의 아바타, 데스크톱 사이드바의 프로필 줄에서 들어온다 */
export function MyPage() {
  const me = useStudyStore((s) => s.me);
  const live = useStudyStore((s) => s.mode === "live");
  const party = usePartySummary();
  const copyInvite = useCopyInvite();
  const logout = useLogout();
  const review = useReviewItems();
  const canReopenInstall = useCanReopenInstallGuide();
  const pendingReview =
    review.data?.items.filter((item) => !item.reviewed).length ?? 0;

  return (
    <div className="flex w-full max-w-thread flex-col gap-7">
      <PageTitle>내 메뉴</PageTitle>

      <section
        aria-label="내 프로필"
        className="card elev-sm flex-row items-center gap-3 p-4"
      >
        <Avatar initial={me.initial} me />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">{me.name}</span>
          <span className="text-label text-muted">목표 {me.target}점</span>
        </span>
        <span className="tag tag-accent">{me.track}</span>
      </section>

      <Section title="파티">
        <p className="m-0 text-meta text-muted">
          {party.name} · {party.summary}
        </p>
        {live ? (
          <PartyList />
        ) : (
          <p className="m-0 text-meta text-muted">
            데모에서는 파티를 바꾸거나 새로 만들 수 없어요.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyInvite}>
            초대 링크 복사
          </Button>
          {live && <NewPartyButton />}
        </div>
      </Section>

      <Section title="인증 사진 저장">
        {live ? (
          <DriveControls />
        ) : (
          <p className="m-0 text-meta text-muted">
            데모에서는 Drive를 연결할 수 없고, 인증 사진도 저장되지 않아요.
          </p>
        )}
      </Section>

      <Section title="알림과 화면">
        <div className="flex flex-wrap gap-2">
          <PushToggle />
          <ThemeToggle label="long" variant="secondary" className="text-meta" />
        </div>
      </Section>

      <Section title="바로가기">
        <ul className="m-0 flex list-none flex-col p-0">
          <ShortcutRow href={ROUTES.records} icon={Images} label="인증 기록" />
          <ShortcutRow
            href={ROUTES.review}
            icon={Notebook}
            label="오답노트"
            badge={pendingReview ? `복습 ${pendingReview}` : undefined}
          />
          <ShortcutRow href={ROUTES.qna} icon={ChatsCircle} label="질문 창구" />
        </ul>
      </Section>

      <Section title="앱 정보">
        {canReopenInstall && (
          <Button
            variant="secondary"
            className="self-start text-meta"
            onClick={reopenInstallGuide}
          >
            <DeviceMobile />
            홈 화면에 추가하는 방법
          </Button>
        )}
        <p className="m-0 text-meta text-muted">
          학습·소통 기록은 만든 날부터 1년이 지나면 자동으로 삭제돼요.
        </p>
        <p className="m-0 flex gap-4 text-meta">
          <Link href="/terms" className="text-muted underline">
            이용약관
          </Link>
          <Link href="/privacy" className="text-muted underline">
            개인정보처리방침
          </Link>
        </p>
      </Section>

      <Button variant="ghost" className="self-start" onClick={logout}>
        <SignOut />
        로그아웃
      </Button>
    </div>
  );
}
