import Link from "next/link";
import { LEGAL_CONTACT } from "@/features/legal/legal-document";

export default function RootPage() {
  return (
    <main className="min-h-dvh bg-bg px-6 py-12 text-text">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 leading-relaxed">
        <header className="flex flex-col gap-4">
          <p className="text-meta text-accent">친구들과 함께하는 토익 스터디</p>
          <h1 className="text-hero">새벽 토익</h1>
          <p className="text-body">
            초대 링크로 스터디 파티에 참가하고, 매일 학습 기록과 인증 사진을
            남기며 서로의 진행 상황을 확인하는 웹 서비스입니다.
          </p>
          <nav aria-label="서비스 시작" className="flex flex-wrap gap-5 text-accent">
            <Link href="/login">로그인 · 내 스터디 열기</Link>
            <Link href="/signup">회원가입</Link>
          </nav>
        </header>
        <section className="card space-y-3 p-6">
          <h2 className="text-h3">함께 공부하는 방법</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>파티를 만들거나 친구의 초대 링크로 참가합니다.</li>
            <li>학습 항목과 사진, 점수·퀴즈 답안을 기록합니다.</li>
            <li>같은 파티원의 진행률과 사진을 웹사이트에서 확인합니다.</li>
            <li>질문·답글, 채팅과 응원으로 학습을 이어갑니다.</li>
          </ul>
        </section>
        <section className="card space-y-3 p-6">
          <h2 className="text-h3">Google 계정과 Drive를 사용하는 이유</h2>
          <p>
            Google 로그인은 계정을 인증하고 이메일·이름·프로필 사진으로
            프로필을 만드는 데 사용합니다. 이메일로 가입할 수도 있습니다.
          </p>
          <p>
            사진 인증에는 로그인과 별도로 개인 Google Drive 연결이 필요합니다.
            앱에서 만든 사진을 본인의 Drive에 저장하며, 같은 파티원에게 앱
            안에서 보여줍니다. Drive 전체 파일 접근 권한은 요청하지 않습니다.
            연결 설정이 완료된 경우 해당 기능을 이용할 수 있습니다.
          </p>
          <p>
            Drive 연결을 해제하면 앱의 사진 조회가 중단되며, 원본 사진은
            본인의 Drive에 남습니다. 데이터 처리와 삭제 요청 방법은
            개인정보처리방침에서 확인할 수 있습니다.
          </p>
          <Link href="/privacy" className="inline-block text-accent">
            개인정보처리방침 확인
          </Link>
        </section>
        <footer className="flex flex-col gap-3 border-t border-divider pt-6 text-meta">
          <nav aria-label="정책" className="flex flex-wrap gap-5 text-accent">
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/terms">이용약관</Link>
          </nav>
          <p>운영자: {LEGAL_CONTACT.operator}</p>
          <a href={`mailto:${LEGAL_CONTACT.email}`} className="break-all text-accent">
            문의: {LEGAL_CONTACT.email}
          </a>
        </footer>
      </div>
    </main>
  );
}
