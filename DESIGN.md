# 새벽 토익 디자인 시스템

Claude Design 프로젝트 **토익 스터디 PWA**의 두 시안을 구현합니다.

| 시안                             | 화면                                 | 구현 범위           |
| -------------------------------- | ------------------------------------ | ------------------- |
| `토익 스터디 웹.dc.html`         | 데스크톱 (사이드바)                  | `md` 이상 (≥ 48rem) |
| `토익 스터디 프로토타입.dc.html` | 모바일 PWA (하단 탭 + 가운데 카메라) | `md` 미만           |

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

| 토큰              | 다크      | 라이트    | 용도                              |
| ----------------- | --------- | --------- | --------------------------------- |
| `--color-bg`      | `#141815` | `#f3f7ec` | 페이지 바탕                       |
| `--color-surface` | `#1f2420` | `#fbfdf7` | 카드, 입력, 다이얼로그            |
| `--color-text`    | `#e9ece7` | `#1c211b` | 본문                              |
| `--color-accent`  | `#a6d86a` | `#4f7d1c` | 주요 버튼 테두리, 링크, 진행 막대 |
| `--color-divider` | text 16%  | text 16%  | 구분선, 보조 버튼 테두리          |

### 단계 (100–900)

- `--color-accent-{100…900}` — 라이트 모드에서는 순서가 뒤집혀서 같은 단계가 같은 "대비"를 유지합니다.
  예) `bg-accent-900` = 다크에선 짙은 녹색 바탕, 라이트에선 옅은 연두 바탕 → 활성 메뉴, AI 답변 박스
- `--color-neutral-{100…900}` — 사이드바 바탕(`neutral-900`), 진행 막대 트랙(`neutral-800`), 비활성 아이콘(`neutral-500/600`)

### 파생 색 (text / accent를 섞어서 자동 계산)

| 토큰                                             | 값                     | 용도                              |
| ------------------------------------------------ | ---------------------- | --------------------------------- |
| `muted`                                          | text 55%               | 보조 설명 (`text-muted`)          |
| `subtle`                                         | text 60%               | 표 헤더                           |
| `soft`                                           | text 70%               | 폼 라벨                           |
| `placeholder`                                    | text 45%               | 입력 placeholder                  |
| `hover` / `pressed`                              | text 7% / 14%          | 보조 버튼 상태                    |
| `row-hover` / `row-rule`                         | text 4% / 8%           | 표 행                             |
| `accent-faint` / `accent-soft` / `accent-strong` | accent 10% / 12% / 22% | 드롭존 선택, 정답 보기, 버튼 눌림 |
| `overlay`                                        | neutral-900 50%        | 다이얼로그 뒤                     |

---

## 타이포그래피

- 글꼴: `--font-body` = Inter → Apple SD Gothic Neo → Malgun Gothic → system-ui (`next/font`로 Inter 로드)
- 제목 굵기: `--font-heading-weight` = 500, 본문 400

| 유틸리티        | 크기 | 쓰는 곳                                    |
| --------------- | ---- | ------------------------------------------ |
| `text-micro`    | 10px | 하단 탭 라벨, 카드 키커, 보충 배지         |
| `text-caption`  | 11px | 태그, 범례                                 |
| `text-label`    | 12px | 보조 설명, 작은 버튼                       |
| `text-meta`     | 13px | 메타 정보, 세그먼트                        |
| `text-body`     | 14px | 기본 UI                                    |
| `text-base`     | 15px | 본문, 큰 버튼                              |
| `text-title`    | 16px | 섹션 제목 (`<SectionTitle>`)               |
| `text-heading`  | 20px | 다이얼로그·스레드 제목, 모바일 페이지 제목 |
| `text-stat`     | 22px | 카드 수치, 점수                            |
| `text-question` | 24px | 데스크톱 퀴즈 문항                         |
| `text-h3`       | 25px | 데스크톱 페이지 제목                       |
| `text-hero`     | 44px | 로그인 헤드라인, 모바일 D-day              |
| `text-display`  | 60px | 데스크톱 D-day                             |

아이콘(Phosphor)은 `1em`이라 크기도 토큰으로: `text-icon-sm`(16) · `text-icon`(18) · `text-icon-md`(20) · `text-icon-lg`(22) · `text-icon-xl`(24) · `text-icon-2xl`(28)

행간: `leading-question`(1.45) · `leading-reading`(1.6) / 자간: `tracking-display`(-0.03em)

---

## 반경 · 그림자

| 토큰                      | 값                    | 용도                     |
| ------------------------- | --------------------- | ------------------------ |
| `rounded-xs`              | 2px                   | 진행 막대                |
| `rounded-sm`              | 4px                   | 트래커 칸, 썸네일        |
| `rounded-md`              | 8px                   | 버튼, 카드, 입력         |
| `rounded-lg`              | 14px                  | 다이얼로그               |
| `shadow-sm`               | 1px 테두리            | 카드 (`elev-sm`)         |
| `shadow-md` / `shadow-lg` | 테두리 + 그림자       | 툴팁 / 토스트·다이얼로그 |
| `shadow-glow`             | accent 10px           | 오늘 진행률 막대         |
| `shadow-camera`           | accent 35% 18px       | 모바일 카메라 버튼       |
| `shadow-ring-accent`      | inset 1px accent      | 선택된 카드, 정답 보기   |
| `shadow-ring-muted`       | inset 1px neutral-500 | 오답 보기                |
| `shadow-ring-divider`     | inset 1px divider     | 트래커 미래 칸           |
| `shadow-ring-selected`    | 2px text              | 트래커 선택 칸           |

---

## 레이아웃 치수

| 토큰                                         | 값                                      | 용도                        |
| -------------------------------------------- | --------------------------------------- | --------------------------- |
| `w-sidebar`                                  | 220px                                   | 데스크톱 사이드바           |
| `px-page-x`                                  | clamp(20px, 4vw, 48px)                  | 데스크톱 본문 좌우 여백     |
| `px-auth-x`                                  | clamp(24px, 6vw, 80px)                  | 로그인 좌우 여백            |
| `pb-tabbar`                                  | 88px                                    | 모바일 하단 탭만큼 여백     |
| `basis-col-*`                                | 560 / 420 / 520 / 320 / 340 / 300 / 440 | 화면별 2단 칼럼             |
| `max-w-auth` · `max-w-quiz` · `max-w-thread` | 380 / 640 / 680                         | 폼·퀴즈·스레드 최대 폭      |
| `size-camera` · `size-thumb`                 | 52 / 64                                 | 카메라 버튼, 인증 썸네일    |
| `h-dropzone` · `h-feed-photo`                | 180 / 120                               | 업로드 영역, 피드 사진      |
| `h-control-lg` · `h-control-xl`              | 44 / 48                                 | 큰 버튼 (데스크톱 / 모바일) |
| `tracker-name-sm`                            | 36px                                    | 모바일 월간 잔디의 이름 칸  |
| `toast-top`                                  | 64px                                    | 전체 화면 토스트 위치(헤더 아래) |

### 안전 영역 · 전체 화면 규칙

- `pt-safe` · `pb-safe` · `top-toast-safe`는 `@utility`입니다. 일반 클래스로 두면 레이어 밖이라 `md:pt-8` 같은 반응형 값을 이겨 버립니다.
- 탭바·헤더 없이 화면 전체를 쓰는 경로는 `features/shell/fullscreen.ts`의 `isFullscreenPath`가 정합니다 (촬영, 단어 연습, AI RC, 해커스 LC/RC, 오답 다시 풀기, 질문 상세, 파티 채팅).
- 이 경로의 화면은 안전 영역을 **직접** 맡습니다. 위는 `ScreenHeader`(pt-safe), 아래는 `PinnedFooter`(pb-safe)입니다. `MainFrame`은 위아래 여백을 주지 않아요. 둘 다 주면 iPhone에서 두 번 들어갑니다.
- `PinnedFooter`는 탭바가 있는 화면에서 쓰지 않습니다(탭바가 가립니다). 토스트는 전체 화면에서 헤더 아래에 뜨고, 설치 안내 카드는 숨습니다.
- 다이얼로그(바텀시트)는 Android 뒤로가기로 닫힙니다(`useCloseWatcher`, Chrome 120+). 새 팝업을 직접 만들면 같은 훅을 씁니다.

### 앱 아이콘 (`public/icons`)

- `icon-192/512.png`: 둥근 모서리(투명). iOS·데스크톱용 `purpose: any`.
- `icon-maskable-192/512.png`: 배경 `#141815`가 가장자리까지 차고, 글리프는 가운데 80% 안. Android 런처가 원·물방울로 자릅니다.
- `badge-96.png`: 푸시 알림 배지. Android는 알파만 쓰므로 흰 글리프 + 투명 배경이어야 합니다.
- 원본은 `icon.svg`입니다. 글리프를 바꾸면 세 종류를 모두 다시 만듭니다.

---

## 컴포넌트 클래스 (Nocturne)

`@layer components`에 정의 — 유틸리티로 덮어쓸 수 있습니다.

| 클래스                                                          | 설명                                      | React                   |
| --------------------------------------------------------------- | ----------------------------------------- | ----------------------- |
| `.btn` `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-icon` | 버튼 (primary는 accent 테두리)            | `<Button variant size>` |
| `.input` `.field`                                               | 입력과 라벨                               | —                       |
| `.seg` `.seg-opt`                                               | 세그먼트 라디오 (로그인/회원가입, 트랙)   | —                       |
| `.radio` `.dot`                                                 | 체크·라디오                               | —                       |
| `.card` `.card-kicker` `.elev-sm`                               | 카드                                      | —                       |
| `.tag` `.tag-accent` `.tag-neutral`                             | 태그                                      | —                       |
| `.ds-table`                                                     | 끝이 사라지는 행 구분선 표                | —                       |
| `.dialog` `.dialog-backdrop` `.dialog-title` `.dialog-actions`  | 다이얼로그 (md 미만은 아래에서 올라오는 시트) | `<Dialog>` (Radix)      |
| `.hr` `.rule-top`                                               | 끝이 사라지는 구분선                      | —                       |
| `.photo-placeholder(-sm)`                                       | 인증 사진 빗금 자리                       | —                       |
| `glow-auth` `glow-main` (utility)                               | 좌상단 accent 글로우, `md:glow-main` 가능 | —                       |

---

## 공통 React 컴포넌트

같은 UI가 두 번 이상 나오면 아래 컴포넌트를 씁니다. 새로 만들 때도 여기에 추가합니다.

| 컴포넌트                                                          | 위치                                      | 쓰는 곳                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `Button` (`variant`: plain·primary·secondary·ghost, `size`: icon) | `components/ui/button`                    | 모든 버튼                                                                    |
| `Dialog` · `DialogContent` · `DialogTitle` · `DialogActions`      | `components/ui/dialog`                    | 인증 · 점수 · 질문 모달 (`useModal(name)`과 함께). `closeLabel`을 주면 닫기(X) |
| `ScreenHeader` · `PinnedFooter`                                   | `components/shared`                       | 전체 화면 상단 바(닫기·제목·진행) · 하단 고정 버튼·입력창 (`keyboardAware`)  |
| `AiText` · `AiConfirm`                                            | `components/shared`                       | AI 답변 본문(줄바꿈 유지) · 파티원 확인 표시 — 채팅과 질문 창구               |
| `FilePickerButton`                                                | `components/shared/file-picker-button`    | 기본 파일 입력 대신 버튼으로 고르기 (해커스 채점표, 오답노트 결과지)         |
| `TextField` · `FieldError`                                        | `components/ui/text-field`, `field-error` | 로그인 · 회원가입 · 점수 입력                                                |
| `ProgressBar`                                                     | `components/ui/progress-bar`              | 오늘 진행률, 할당량·교재 막대, 퀴즈 진행                                     |
| `PageTitle` · `SectionTitle`                                      | `components/shared`                       | 페이지 제목(모바일 heading / 데스크톱 h3) · 섹션 제목                        |
| `ActionCard`                                                      | `components/shared/action-card`           | 키커·제목·설명 + 오른쪽 액션 카드 (테스트, 홈 바로가기, 콕 찌르기·축하 카드) |
| `MessageComposer`                                                 | `components/shared/message-composer`      | 질문 창구·파티 채팅 입력. 높이가 늘어나는 입력창, 한글 조합 중 Enter 무시, 터치 기기는 Enter가 줄바꿈 |
| `IconLink`                                                        | `components/shared/icon-link`             | 닫기(X), 채팅 바로가기                                                       |
| `ThemeToggle` (`label`: short·long·icon)                          | `components/shared/theme-toggle`          | 로그인 우상단, 사이드바, 내 메뉴                                             |
| `Avatar` · `BrandMark`                                            | `components/shared`                       | 멤버 이니셜(모바일 헤더의 내 메뉴 링크 포함), 로고                            |
| `TaskStatusIcon` · `DriveSaveHint`                                | `features/study`                          | 할당량 체크, 드라이브 저장 경로                                              |
| `TaskShortcutChips`                                               | `features/study/task-shortcut-chips`      | 항목 아래 "테스트로 인증" 칩 — 홈 체크리스트, 촬영 화면                       |
| `DriveBanner` (`inline`)                                          | `features/study/drive-banner`             | Drive 미연결일 때만 보이는 한 줄 안내 — 레이아웃 위, 촬영·해커스 화면 안      |
| `ReportRowsView` · `ReportRowEditorList`                          | `features/quiz`                           | 해커스 문항 결과(모바일 칩 / 데스크톱 표) · 모바일 A–D 버튼 수정              |
| `NudgeButton` · `CheerButton`                                     | `features/party/party-buttons`            | 콕 찌르기(멤버별 하루 1회), 축하                                             |
| `PushToggle` (`compact`)                                          | `features/chat/push-toggle`               | 채팅 헤더, 내 메뉴                                                           |
| `PartyList` · `NewPartyButton`                                    | `features/party/party-setup`              | 내 메뉴의 파티 전환(라디오 카드) · 새 파티 만들기                            |
| `InstallGuide`                                                    | `features/pwa/install-guide`              | 모바일 홈 화면 설치 안내 — 브라우저별 단계(iOS Safari·iOS 다른 브라우저·Android Chrome·삼성 인터넷 등), 설치 프롬프트가 있으면 [앱 설치] |
| `InAppBrowserNotice` (`login` · `install`)                        | `features/pwa/in-app-notice`              | 카카오톡 등 앱 안 브라우저일 때만 — 기기 브라우저로 열기·주소 복사 (로그인·초대 참가·설치 안내) |

---

## 화면 매핑

| 경로                             | 데스크톱 (웹 시안)                                     | 모바일 (프로토타입)                        |
| -------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `/login` `/signup`               | 좌측 소개 + 우측 폼, 우상단 라이트/다크                | 같은 화면이 세로로 쌓임, 라이트/다크는 화면 우상단 |
| `/dashboard`                     | D-day · 할당량 카드 · 파티 표 · 테스트 바로가기 · 피드 | D-day · 체크리스트(+ 테스트로 인증 칩) · 콕 찌르기 · 축하 카드 |
| `/me`                            | 프로필 · 파티 목록·새 파티·초대 · Drive · 알림·화면 · 바로가기 · 로그아웃 (사이드바 프로필 줄) | 같은 화면, 모바일 헤더의 아바타로 들어감 |
| `/study/upload`                  | (사이드바 버튼 → 인증 모달)                            | 전체 화면 · 항목 고르고 [촬영] [앨범] · 테스트 칩 · 하단 고정 "인증 올리기" (보드 3a) |
| `/tracker`                       | 월간 히트맵 + 칸 상세(그날 인증 사진)                  | [이번 주 \| 월간] — 이번 주 막대(4a), 월간 잔디 + 하루 상세·멤버 칩·날짜 이동(4b) |
| `/records`                       | 월 이동·멤버·항목 필터 + 날짜별 사진 그리드 + 상세 패널 | 같은 그리드, 상세는 바텀시트(닫기 버튼, 해커스 문항은 칩) |
| `/quizzes`                       | 오늘 할 것 · 복습 · 주간/월간 카드 + 점수 추이·오답 통계 | 같은 구성이 세로로 쌓임                    |
| `/quizzes/daily` `/quizzes/rc`   | 퀴즈 · AI RC 문항 + 해설, "질문 창구에 올리기"          | 전체 화면, 진행 막대, 하단 고정 버튼 (보드 5b) |
| `/quizzes/hackers` `/hackers/lc` | 결과지 받기 → 파일 확인 → 결과 확인·저장 단계, 제출 기록 접기 | 전체 화면, 문항 수정은 A–D 버튼 카드     |
| `/quizzes/review`                | 오답노트: 출처 칩 · 복습 상태 · 정답 가리기 · 해커스 결과지로 채우기 · 한 문제씩 다시 풀기 | 출처 칩은 한 줄 가로 스크롤             |
| `/quizzes/review/retry`          | 복습 전 오답을 한 문제씩 다시 풀기, 복습 완료 표시       | 전체 화면 (보드 5b)                        |
| `/qna`                           | 질문 목록 (누르면 상세 경로)                           | 같은 목록                                  |
| `/qna/[threadId]`                | 질문 · AI 답변(파티원 확인) · 파티원 답변 · 입력창 하나 [파티원에게 \| AI에게] | 전체 화면, 하단 고정 입력창 (보드 6a) |
| `/party/[partyId]/chat/[roomId]` | 파티 채팅: [전체 \| 질문만], @AI 답변·확인, 인증 알림·축하 | 전체 화면, 하단 고정 입력창 (보드 6b), 헤더의 채팅 아이콘으로 들어감 |
| `/chat`                          | 현재 파티 채팅방으로 이동 (홈 화면 앱 바로가기용)      | 같음                                       |

Claude Design 편집기 UI(상단 theme/accent 드롭다운, Comment·Edit·Present·Share)는 앱에 포함하지 않습니다.
