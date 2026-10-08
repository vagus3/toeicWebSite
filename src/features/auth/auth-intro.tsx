import { Camera, ChartBar, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/shared/brand-mark";
import { PARTY } from "@/lib/demo-data";

const FEATURES = [
  { icon: Camera, label: "사진 인증 · 구글 드라이브 저장" },
  { icon: ChartBar, label: "파티 트래커" },
  { icon: Sparkle, label: "AI 테스트 · 질문" },
];

/** 로그인 화면 왼쪽 — 브랜드 · 헤드라인 · 기능 소개 */
export function AuthIntro() {
  return (
    <section className="glow-auth flex min-w-0 flex-1 basis-col-half flex-col justify-between gap-10 px-auth-x py-12">
      <div className="flex items-center gap-2.5">
        <BrandMark />
        <span className="text-title font-medium">{PARTY.brand}</span>
      </div>
      <div className="flex max-w-hero flex-col gap-3.5">
        <h1 className="m-0 text-hero text-pretty">같이 하면 끝까지 가는 토익 스터디</h1>
        <p className="m-0 text-base leading-reading text-pretty text-muted">
          링크로 파티에 참가하고, 매일 할당량을 사진으로 인증하고, 서로의 진행률을 트래커로
          확인해요.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-7 p-0 text-meta text-muted">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="text-icon text-accent" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
