# 새벽 토익 디자인 시스템

Claude Design 프로젝트 **토익 스터디 PWA**의 두 시안을 구현합니다.

| 시안 | 화면 | 구현 범위 |
| --- | --- | --- |
| `토익 스터디 웹.dc.html` | 데스크톱 (사이드바) | `md` 이상 (≥ 48rem) |
| `토익 스터디 프로토타입.dc.html` | 모바일 PWA (하단 탭 + 가운데 카메라) | `md` 미만 |

기반 시스템은 **Nocturne**이고 테마는 **lime**입니다. 기본은 다크 모드, 라이트 모드는 `<html data-theme="light">`로 전환합니다.

---

## 원칙 — 하드코딩 금지

1. **모든 색·글꼴·글자 크기·반경·그림자·레이아웃 치수는 `src/app/globals.css`의 토큰으로만 정의**합니다.
2. 컴포넌트에서는 **토큰 이름의 유틸리티**만 씁니다: `bg-surface`, `text-meta`, `rounded-md`, `shadow-ring-accent`, `w-sidebar` …
3. `text-[13px]`, `#a6d86a`, `style={{ fontSize: 13 }}` 같은 **임의 값은 쓰지 않습니다.** 필요한 값이 없으면 먼저 `@theme`에 토큰을 추가합니다.
4. `style`은 **데이터에서 나온 값**(진행률 폭 `width: 62%`, 트래커 열 개수)에만 씁니다.
5. 다크/라이트는 토큰 값만 바뀝니다. 컴포넌트에 `dark:` 분기를 만들지 않습니다.

> 토큰 이름이 Tailwind v4 네임스페이스(`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--spacing-*`, `--container-*`)를 따르므로 `@theme`에 선언하면 유틸리티가 자동으로 생깁니다.
> 새 글자 크기 토큰을 추가하면 `src/lib/utils.ts`의 `FONT_SIZE_TOKENS`에도 넣어야 `cn()`이 색상 클래스와 충돌하지 않습니다.

---

## 색상

### 기본 (테마별 값)

| 토큰 | 다크 | 라이트 | 용도 |
| --- | --- | --- | --- |
| `--color-bg` | `#141815` | `#f3f7ec` | 페이지 바탕 |
| `--color-surface` | `#1f2420` | `#fbfdf7` | 카드, 입력, 다이얼로그 |
| `--color-text` | `#e9ece7` | `#1c211b` | 본문 |
| `--color-accent` | `#a6d86a` | `#4f7d1c` | 주요 버튼 테두리, 링크, 진행 막대 |
| `--color-divider` | text 16% | text 16% | 구분선, 보조 버튼 테두리 |

### 단계 (100–900)

- `--color-accent-{100…900}` — 라이트 모드에서는 순서가 뒤집혀서 같은 단계가 같은 "대비"를 유지합니다.
  예) `bg-accent-900` = 다크에선 짙은 녹색 바탕, 라이트에선 옅은 연두 바탕 → 활성 메뉴, AI 답변 박스
- `--color-neutral-{100…900}` — 사이드바 바탕(`neutral-900`), 진행 막대 트랙(`neutral-800`), 비활성 아이콘(`neutral-500/600`)

### 파생 색 (text / accent를 섞어서 자동 계산)

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `muted` | text 55% | 보조 설명 (`text-muted`) |
| `subtle` | text 60% | 표 헤더 |
| `soft` | text 70% | 폼 라벨 |
| `placeholder` | text 45% | 입력 placeholder |
| `hover` / `pressed` | text 7% / 14% | 보조 버튼 상태 |
| `row-hover` / `row-rule` | text 4% / 8% | 표 행 |
| `accent-faint` / `accent-soft` / `accent-strong` | accent 10% / 12% / 22% | 드롭존 선택, 정답 보기, 버튼 눌림 |
| `overlay` | neutral-900 50% | 다이얼로그 뒤 |

---

## 타이포그래피

- 글꼴: `--font-body` = Inter → Apple SD Gothic Neo → Malgun Gothic → system-ui (`next/font`로 Inter 로드)
- 제목 굵기: `--font-heading-weight` = 500, 본문 400

| 유틸리티 | 크기 | 쓰는 곳 |
| --- | --- | --- |
| `text-micro` | 10px | 하단 탭 라벨, 카드 키커, 보충 배지 |
| `text-caption` | 11px | 태그, 범례 |
| `text-label` | 12px | 보조 설명, 작은 버튼 |
| `text-meta` | 13px | 메타 정보, 세그먼트 |
| `text-body` | 14px | 기본 UI |
| `text-base` | 15px | 본문, 큰 버튼 |
| `text-title` | 16px | 섹션 제목 (`<SectionTitle>`) |
| `text-heading` | 20px | 다이얼로그·스레드 제목, 모바일 페이지 제목 |
| `text-stat` | 22px | 카드 수치, 점수 |
| `text-question` | 24px | 데스크톱 퀴즈 문항 |
| `text-h3` | 25px | 데스크톱 페이지 제목 |
| `text-hero` | 44px | 로그인 헤드라인, 모바일 D-day |
| `text-display` | 60px | 데스크톱 D-day |

아이콘(Phosphor)은 `1em`이라 크기도 토큰으로: `text-icon-sm`(16) · `text-icon`(18) · `text-icon-md`(20) · `text-icon-lg`(22) · `text-icon-xl`(24) · `text-icon-2xl`(28)

행간: `leading-question`(1.45) · `leading-reading`(1.6) / 자간: `tracking-display`(-0.03em)

---

## 반경 · 그림자

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `rounded-xs` | 2px | 진행 막대 |
| `rounded-sm` | 4px | 트래커 칸, 썸네일 |
| `rounded-md` | 8px | 버튼, 카드, 입력 |
| `rounded-lg` | 14px | 다이얼로그 |
| `shadow-sm` | 1px 테두리 | 카드 (`elev-sm`) |
| `shadow-md` / `shadow-lg` | 테두리 + 그림자 | 툴팁 / 토스트·다이얼로그 |
| `shadow-glow` | accent 10px | 오늘 진행률 막대 |
| `shadow-camera` | accent 35% 18px | 모바일 카메라 버튼 |
| `shadow-ring-accent` | inset 1px accent | 선택된 카드, 정답 보기 |
| `shadow-ring-muted` | inset 1px neutral-500 | 오답 보기 |
| `shadow-ring-divider` | inset 1px divider | 트래커 미래 칸 |
| `shadow-ring-selected` | 2px text | 트래커 선택 칸 |

---

## 레이아웃 치수

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `w-sidebar` | 220px | 데스크톱 사이드바 |
| `px-page-x` | clamp(20px, 4vw, 48px) | 데스크톱 본문 좌우 여백 |
| `px-auth-x` | clamp(24px, 6vw, 80px) | 로그인 좌우 여백 |
| `pb-tabbar` | 88px | 모바일 하단 탭만큼 여백 |
| `basis-col-*` | 560 / 420 / 520 / 320 / 340 / 300 / 440 | 화면별 2단 칼럼 |
| `max-w-auth` · `max-w-quiz` · `max-w-thread` | 380 / 640 / 680 | 폼·퀴즈·스레드 최대 폭 |
| `size-camera` · `size-thumb` | 52 / 64 | 카메라 버튼, 인증 썸네일 |
| `h-dropzone` · `h-feed-photo` | 180 / 120 | 업로드 영역, 피드 사진 |
| `h-control-lg` · `h-control-xl` | 44 / 48 | 큰 버튼 (데스크톱 / 모바일) |

---

## 컴포넌트 클래스 (Nocturne)

`@layer components`에 정의 — 유틸리티로 덮어쓸 수 있습니다.

| 클래스 | 설명 | React |
| --- | --- | --- |
| `.btn` `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-icon` | 버튼 (primary는 accent 테두리) | `<Button variant size>` |
| `.input` `.field` | 입력과 라벨 | — |
| `.seg` `.seg-opt` | 세그먼트 라디오 (로그인/회원가입, 트랙) | — |
| `.radio` `.dot` | 체크·라디오 | — |
| `.card` `.card-kicker` `.elev-sm` | 카드 | — |
| `.tag` `.tag-accent` `.tag-neutral` | 태그 | — |
| `.ds-table` | 끝이 사라지는 행 구분선 표 | — |
| `.dialog` `.dialog-backdrop` `.dialog-title` `.dialog-actions` | 다이얼로그 | `<Dialog>` (Radix) |
| `.hr` `.rule-top` | 끝이 사라지는 구분선 | — |
| `.photo-placeholder(-sm)` | 인증 사진 빗금 자리 | — |
| `glow-auth` `glow-main` (utility) | 좌상단 accent 글로우, `md:glow-main` 가능 | — |

---

## 공통 React 컴포넌트

같은 UI가 두 번 이상 나오면 아래 컴포넌트를 씁니다. 새로 만들 때도 여기에 추가합니다.

| 컴포넌트 | 위치 | 쓰는 곳 |
| --- | --- | --- |
| `Button` (`variant`: plain·primary·secondary·ghost, `size`: icon) | `components/ui/button` | 모든 버튼 |
| `Dialog` · `DialogContent` · `DialogTitle` · `DialogActions` | `components/ui/dialog` | 인증 · 점수 · 질문 모달 (`useModal(name)`과 함께) |
| `TextField` · `FieldError` | `components/ui/text-field`, `field-error` | 로그인 · 회원가입 · 점수 입력 |
| `ProgressBar` | `components/ui/progress-bar` | 오늘 진행률, 할당량·교재 막대, 퀴즈 진행 |
| `PageTitle` · `SectionTitle` | `components/shared` | 페이지 제목(모바일 heading / 데스크톱 h3) · 섹션 제목 |
| `ActionCard` | `components/shared/action-card` | 키커·제목·설명 + 오른쪽 액션 카드 (테스트, 홈 바로가기, 콕 찌르기·축하 카드) |
| `MessageComposer` | `components/shared/message-composer` | 질문 창구 보충 답변, 파티 채팅 입력 |
| `IconLink` | `components/shared/icon-link` | 닫기(X), 채팅 바로가기 |
| `ThemeToggle` (`label`: short·long·icon) | `components/shared/theme-toggle` | 로그인 우상단, 사이드바, 모바일 헤더 |
| `Avatar` · `BrandMark` | `components/shared` | 멤버 이니셜, 로고 |
| `TaskStatusIcon` · `DriveSaveHint` | `features/study` | 할당량 체크, 드라이브 저장 경로 |
| `NudgeButton` · `CheerButton` | `features/party/party-buttons` | 콕 찌르기(멤버별 하루 1회), 축하 |
| `PushToggle` (`compact`) | `features/chat/push-toggle` | 채팅 헤더, 모바일 헤더 알림 |
| `InstallGuide` | `features/pwa/install-guide` | 모바일 홈 화면 설치 안내 (iOS 공유→추가 / Android 앱 설치 버튼·메뉴 안내) |

---

## 화면 매핑

| 경로 | 데스크톱 (웹 시안) | 모바일 (프로토타입) |
| --- | --- | --- |
| `/login` `/signup` | 좌측 소개 + 우측 폼, 우상단 라이트/다크 | 같은 화면이 세로로 쌓임 |
| `/dashboard` | D-day · 할당량 카드 · 파티 표 · 테스트 바로가기 · 피드 | D-day · 체크리스트 · 콕 찌르기 · 축하 카드 |
| `/study/upload` | (사이드바 버튼 → 인증 모달) | 항목 고르고 바로 촬영 |
| `/tracker` | 월간 히트맵 + 칸 상세 | 이번 주 멤버별 할당량·교재 막대 |
| `/quizzes` | 일일/주간/월간 카드 + 점수 추이 | 같은 카드, 아래 점수 추이 |
| `/quizzes/daily` | 퀴즈 3문항 + AI 해설 | 전체 화면, 하단 큰 버튼 |
| `/qna` | 스레드 목록 + 상세 | 목록 아래 상세 |
| `/party/[partyId]/chat/[roomId]` | 파티 채팅 (설계안 추가 기능, 같은 토큰으로 구성) | 헤더의 채팅 아이콘 |

Claude Design 편집기 UI(상단 theme/accent 드롭다운, Comment·Edit·Present·Share)는 앱에 포함하지 않습니다.
