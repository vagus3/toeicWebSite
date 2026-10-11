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
| 사진 저장          | 각 사용자의 Google Drive + 사진 압축 (기존 Supabase 사진 조회 호환)               |
| AI                 | Groq Chat Completions API                                                              |
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
2. **Google Cloud** — Drive API 활성화, 웹 OAuth 클라이언트 생성. 아래 개인 Drive 설정을 진행합니다. 신규 사진 업로드에는 본인 Drive 연결이 필요합니다.
   (OAuth 앱이 Testing 상태면 refresh token이 7일 뒤 만료될 수 있음)
3. **Groq** — Groq Console에서 API 키 발급 (`GROQ_API_KEY`, 서버 전용). `GROQ_MODEL`로 모델 선택 가능 (기본 `openai/gpt-oss-20b`). 질문별 AI 후속 대화와 파티원 댓글은 별도로 저장됩니다.
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

실제 모드에서는 파티 생성·참가, 사진 인증, 점수, 질문·답글, 응원, 독려, 퀴즈 결과를 DB에 저장합니다. 화면은 저장 후 서버 데이터를 다시 읽고, 학습 날짜는 한국 시간 기준으로 계산합니다. 일일 단어 테스트는 고정 연습 문제입니다. 일일 RC 테스트는 Groq가 Part 5·6·7 각 1문항을 생성하며, 같은 파티는 한국 시간 기준 하루 한 세트를 공유합니다. 서버 채점 후 해설과 결과를 저장하고 RC를 자동 인증합니다. 해커스 RC 제출은 외부 사이트에서 풀이 후 채점표 이미지(PNG·JPG·WebP)를 선택해 Groq OCR로 읽고, 확인·수정한 결과와 개인 Drive 원본을 함께 저장하는 방식입니다. 공식 결과 연동이 아닌 제출자 확인 기록이며 직접 입력도 가능합니다. `GROQ_VISION_MODEL`로 이미지 모델을 별도 지정할 수 있습니다(기본 `qwen/qwen3.8-27b`).

### 개인 Drive 연결

각 사용자가 로그인 후 **내 Drive 연결**에서 동의하면 본인 Drive에 `새벽 토익 인증` 폴더를 만듭니다. 신규 인증 사진은 이 폴더에 저장하고 DB에는 파일 ID와 소유자만 기록합니다. 같은 파티원은 웹사이트 안에서 사진을 보고 확대할 수 있습니다. 공개 링크나 파티원 Google 계정에 대한 직접 Drive 공유는 생성하지 않습니다.

Google Cloud의 웹 OAuth 클라이언트 **Authorized redirect URIs**에는 기존 Supabase 로그인 콜백과 별도로 다음을 추가합니다.

```text
https://toeicwebsite-src.vercel.app/auth/drive/callback
```

Google Drive API를 활성화하고 OAuth의 Data Access에 `https://www.googleapis.com/auth/drive.file`을 등록합니다. Drive 연결 요청은 `openid`, `email`, `drive.file` 권한을 사용합니다. Testing 상태에서는 연결할 계정을 테스트 사용자로 등록해야 하며, 테스트용 Google 권한/refresh token은 7일 후 만료되어 재연결이 필요할 수 있습니다.

서버 환경변수:

| 이름 | 용도 |
| --- | --- |
| `GOOGLE_CLIENT_ID` | 위 웹 OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 위 클라이언트의 Secret |
| `SUPABASE_SECRET_KEY` | 서버 전용 Supabase Secret 또는 service_role 키. 로그인·파일 RLS 검증 후 연결 자격증명에만 접근 |
| `DRIVE_TOKEN_ENCRYPTION_KEY` | 32바이트 난수의 base64 값. 사용자 ID에 바인딩한 AES-256-GCM 토큰 암호화 |

이 값들은 Git에 넣지 않고 Vercel 환경변수 또는 `.env.local`에 등록합니다. 암호화 키는 기존 연결이 있는 동안 유지해야 합니다. 계정 토큰과 암호화 키는 클라이언트에 전달하지 않습니다. Drive 연결 해제는 서버에 저장한 토큰을 삭제하며 Drive 원본 파일은 남깁니다. 앱의 기존 사진 조회는 재연결 전까지 중단됩니다. Google 계정의 앱 권한 자체를 철회하려면 Google 계정 보안 설정을 사용합니다. 재연결은 기존 사진을 보존하기 위해 같은 Google 계정으로 제한됩니다.

개인 Drive 전환 이전에 저장한 Supabase 사진은 계속 조회할 수 있습니다. 기존 운영자 Drive 사진은 기존 환경변수로 읽기만 지원합니다.

### 친구용 운영과 기록 보관

기존 무료 주소를 유지하며 Google 브랜딩 재인증은 보류합니다. Google 게시 설정,
콜백 URL, 환경변수와 확인 순서는 [친구용 운영 안내](docs/friends-operation.md)를 참고하세요.
학습·소통 기록은 생성일부터 1년 경과 후 일일 Cron에서 삭제하고, 개인 Drive 원본과
계정·파티 설정은 유지합니다. `SUPABASE_SECRET_KEY`와 `CRON_SECRET` 등록 및 운영 배포가
완료되어야 자동 삭제가 동작합니다. 삭제 대상은 `public.purge_expired_records()`로
미리보기할 수 있으며 기본 호출은 데이터를 변경하지 않습니다.

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
