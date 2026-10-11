import Link from "next/link";
import type { ReactNode } from "react";

// 일부 국외 처리 및 제공업체 백업·로그 조건이 미확정이므로 초안을 유지한다.
const LEGAL_POLICY_DRAFT = true;
export const LEGAL_CONTACT: { operator: string | null; email: string | null } =
  {
    operator: "심형규",
    email: "b01038674869@gmail.com",
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
          <h1 className="text-h3">{title}</h1>
          <p className="text-meta text-muted">작성일: 2026년 10월 11일</p>
          {LEGAL_POLICY_DRAFT && (
            <p role="note" className="card p-4 text-meta">
              문서 초안입니다. 기록 보관·삭제 기준은 아래와 같으며, 일부 국외
              처리와 제공업체 백업·로그 조건은 확인 중입니다.
            </p>
          )}
        </header>
        {children}
        <section className="flex flex-col gap-2">
          <h2 className="text-heading">운영자 및 문의</h2>
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
      <h2 className="text-heading">{title}</h2>
      {children}
    </section>
  );
}
