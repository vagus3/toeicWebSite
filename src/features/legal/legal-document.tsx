import Link from "next/link";
import type { ReactNode } from "react";

// 실제 운영자 정보가 확인되기 전에는 초안으로 유지한다.
export const LEGAL_CONTACT: { operator: string | null; email: string | null } =
  {
    operator: null,
    email: null,
  };

export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-bg px-6 py-12 text-text">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-body leading-relaxed">
        <header className="flex flex-col gap-4">
          <Link href="/login" className="self-start text-accent">
            새벽 토익
          </Link>
          <h1 className="text-h2">{title}</h1>
          <p className="text-meta text-muted">작성일: 2026년 10월 11일</p>
          {(!LEGAL_CONTACT.operator || !LEGAL_CONTACT.email) && (
            <p role="note" className="card p-4 text-meta">
              문서 초안입니다. 운영자 정보와 문의처를 확인한 뒤 게시할
              예정입니다.
            </p>
          )}
        </header>
        {children}
        <section className="flex flex-col gap-2">
          <h2 className="text-h4">운영자 및 문의</h2>
          <p>운영자: {LEGAL_CONTACT.operator ?? "확인 중"}</p>
          <p>
            문의:{" "}
            {LEGAL_CONTACT.email ? (
              <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-accent">
                {LEGAL_CONTACT.email}
              </a>
            ) : (
              "문의 이메일 확인 중"
            )}
          </p>
        </section>
        <footer className="flex flex-wrap gap-5 border-t border-divider pt-6 text-meta">
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/login">로그인으로 돌아가기</Link>
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h4">{title}</h2>
      {children}
    </section>
  );
}
