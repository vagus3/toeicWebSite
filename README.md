# 새벽 토익 — TOEIC Study Party (PWA)

친구들과 파티를 만들어 매일 할당량을 사진으로 인증하고, 진행률을 트래커로 확인하며, 테스트·질문·채팅으로 서로 독려하는 토익 스터디 PWA입니다.

- 디자인: Claude Design **토익 스터디 PWA** 프로젝트 (웹 시안 + 모바일 프로토타입) → [`DESIGN.md`](./DESIGN.md)
- 다크 모드 기본, 라이트 모드 토글 (선택은 기기에 저장, 새로고침 시 깜빡임 없음)

## 기술 스택

| 영역               | 기술                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| 프론트엔드 · API   | Next.js 16 (App Router, Route Handlers) + TypeScript                                      |
| UI                 | Tailwind CSS v4 + Nocturne 디자인 토큰, shadcn 방식 컴포넌트(Radix · cva), Phosphor Icons |
| 상태 · 데이터      | Zustand (UI 상태), TanStack Query (서버 데이터)                                           |
| 폼 검증            | React Hook Form + Zod                                                                     |
| 차트               | Recharts                                                                                  |
| DB · 인증 · 실시간 | Supabase (PostgreSQL + RLS, Auth + Google OAuth, Realtime Broadcast)                      |
| 사진 저장          | Supabase 비공개 Storage (기본) / 운영자 Google Drive (선택) + 사진 압축               |
| AI                 | Gemini API (`@google/genai`)                                                              |
| PWA · 알림         | Web App Manifest + Service Worker(`public/sw.js`) + Web Push(`web-push`)                  |
| 테스트             | Vitest                                                                                    |

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 값은 비워 둬도 데모 모드로 실행됩니다
pnpm dev                     # http://localhost:3000
```

| 명령                        | 설명                         |
| --------------------------- | ---------------------------- |
| `pnpm dev`                  | 개발 서버                    |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 / 실행         |
| `pnpm lint`                 | ESLint                       |
| `pnpm exec vitest run`      | 단위 테스트 (진행률 계산 등) |
| `pnpm test:db`              | Docker PostgreSQL에서 마이그레이션·RLS·저장 검증 |
| `pnpm db:link`              | Supabase 프로젝트 연결 |
| `pnpm db:push`              | 연결한 프로젝트에 미적용 마이그레이션 반영 |

### 데모 모드

`.env.local`이 비어 있으면 시안의 데모 데이터(새벽 토익 4인방, 10/8 기준)로 모든 화면이 동작합니다.
데모 모드의 변경은 기기에 열린 화면에서만 유지됩니다. 실제 계정·파티·데이터 저장에는 Supabase 환경변수가 필요합니다.

### 실제 서비스 연결

1. **Supabase** — 아래 CLI 절차로 `supabase/migrations/`의 SQL을 적용합니다. Auth에서 Google 공급자를 활성화하고 배포 주소의 `/auth/callback`을 허용 리디렉션 URL에 등록합니다. 앱에는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`가 필요합니다.
2. **Google Cloud (선택)** — Drive API 활성화, OAuth 클라이언트 생성. 운영자 계정으로 한 번 연결해 refresh token과 루트 폴더 ID를 환경변수에 저장. 미설정 시 Supabase의 비공개 `study-evidence` 버킷을 사용합니다.
   (OAuth 앱이 Testing 상태면 refresh token이 7일 뒤 만료될 수 있음)
3. **Gemini** — Google AI Studio에서 API 키 발급 (`GEMINI_API_KEY`, 서버 전용)
4. **Web Push** — `pnpm dlx web-push generate-vapid-keys`로 키 생성. iPhone은 iOS 16.4+에서 홈 화면에 추가한 뒤 알림 허용
5. **Vercel** — 환경변수 등록 후 배포 (HTTPS가 있어야 PWA 설치·푸시 가능)

Supabase CLI는 개발 의존성으로 설치되어 있습니다. 프로젝트 연결과 스키마 반영은 별개이며, 이후 SQL 변경도 마이그레이션 파일로 추가한 뒤 반영합니다.

```bash
pnpm exec supabase login
pnpm db:link
pnpm exec supabase db push --skip-vault --dry-run
pnpm db:push
```

일반 로그인 화면에는 초대 안내가 없습니다. `/invite/<code>`로 들어온 경우에만 실제 파티와 초대한 사람을 확인하고 로그인·가입 후 참가합니다. 기존 회원도 초대 링크에서 참가할 수 있고, 정원이 찬 파티는 참가를 거절합니다.

실제 모드에서는 파티 생성·참가, 사진 인증, 점수, 질문·답글, 응원, 독려, 퀴즈 결과를 DB에 저장합니다. 화면은 저장 후 서버 데이터를 다시 읽고, 학습 날짜는 한국 시간 기준으로 계산합니다. 일일 퀴즈 문제는 현재 고정 연습 문제이며 AI 문제 생성은 구현되지 않았습니다.

### 홈 화면 설치 (PWA)

모바일에서 처음 들어오면 하단에 설치 안내가 뜹니다 (닫으면 다시 안 뜸, 이미 설치해 앱으로 열면 안 뜸).

| 기기                   | 안내                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| iPhone · iPad (Safari) | 공유 버튼 → ‘홈 화면에 추가’ → 홈 화면 아이콘으로 열기. iOS 16.4+ 홈 화면 앱에서만 푸시 알림 가능                |
| Android (Chrome)       | Chrome이 설치 가능하다고 알려주면 **[앱 설치]** 버튼 한 번으로 설치, 아니면 메뉴(⋮) → ‘앱 설치’/‘홈 화면에 추가’ |

배포 빌드(`pnpm build && pnpm start`)에서 서비스 워커가 등록됩니다. 인증된 페이지와 사진은 캐시하지 않고, 오프라인에서는 공통 안내 페이지를 보여줍니다.

## 디렉터리

```
src/
├── app/
│   ├── (auth)/login, signup        로그인 · 회원가입
│   ├── (main)/                     사이드바(데스크톱) · 하단 탭(모바일) 레이아웃
│   │   ├── dashboard               홈
│   │   ├── tracker                 트래커
│   │   ├── quizzes, quizzes/daily  테스트 · 일일 퀴즈
│   │   ├── qna                     질문 창구
│   │   ├── study/upload            모바일 인증 촬영
│   │   └── party/[partyId]/chat/[roomId]  파티 채팅
│   ├── api/ (upload, ai/ask, chat/messages, push/subscribe)
│   ├── auth/callback, invite/[code]
│   ├── manifest.ts
│   └── globals.css                 디자인 토큰 (색 · 글꼴 · 크기 · 반경 · 그림자 · 치수)
├── components/ui, shared           Button · Dialog · ProgressBar · Avatar …
├── features/                       auth · shell · study · tracker · quiz · qna · chat · party · pwa
├── lib/                            supabase · google-drive · ai · push · api(서버 공통) · http(클라이언트 요청) · theme · demo-data
├── stores/                         zustand (학습 상태 · 테마 · 토스트)
└── types/
supabase/migrations/                스키마 + RLS + Realtime 트리거
public/sw.js                        푸시 수신 · 알림 클릭 이동 · 오프라인 대비
```
