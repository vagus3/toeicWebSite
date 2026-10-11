# 친구용 무료 운영

기존 `https://toeicwebsite-src.vercel.app` 주소를 유지한다. 유료 도메인 구매와
Google 브랜딩 재인증은 보류한다. 개인용 앱 예외를 이용하더라도 Google 사용자
데이터 정책은 준수해야 한다. Google 승인이나 경고 없는 로그인을 보장하지 않는다.

## Google 콘솔에서 직접 확인

프로젝트: `gen-lang-client-0685953104`. 브라우저 접근 차단 설정으로 자동 변경하지 않았다.

1. Branding: 앱 이름 `새벽 토익`, 지원 이메일 `b01038674869@gmail.com`, 홈페이지
   `https://toeicwebsite-src.vercel.app/`, 개인정보처리방침 `/privacy`, 약관 `/terms`.
2. Audience: `External`, 게시 상태 `In production`. 개인용 앱 예외의 적용 여부를
   확인하고 게시한다. 친구들이 사용하는 소규모 운영이며 공개 배포 확대는 하지 않는다.
   `In production`은 앱 차원의 친구 전용 접근 제한을 만드는 설정이 아니다.
3. Data Access: 로그인용 `openid`, 이메일·프로필 권한 및
   `https://www.googleapis.com/auth/drive.file`만 사용한다. Drive 전체 권한을 추가하지 않는다.
4. Google Drive API를 활성화하고 같은 웹 OAuth 클라이언트에 다음 두 URI를 등록한다.
   - `https://ywmnbqgqxexcbjeottys.supabase.co/auth/v1/callback`
   - `https://toeicwebsite-src.vercel.app/auth/drive/callback`
5. Supabase Auth의 Google 공급자에 Client ID/Secret을 직접 등록한다. Supabase의
   Site URL은 운영 주소, Redirect URLs에는 운영 `/auth/callback`과 초대 연결에
   필요한 해당 콜백의 쿼리 허용 패턴을 등록한다.

Testing에서는 Drive 권한 승인/refresh token이 7일 후 만료된다. In production이라도
사용자가 권한을 철회하거나 Google의 다른 만료 조건에 해당하면 재연결이 필요하다.

## Vercel 운영 변수

Production 대상에 `SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`DRIVE_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`가 필요하다. 비밀값은 저장소·대화·로그에
남기지 않고 대시보드에 직접 입력한다. 기존 암호화 키를 교체하지 않는다.
질문 창구의 AI 대화에는 추가로 `GROQ_API_KEY`가 필요하다. `GROQ_MODEL`은 선택 항목이며
기본값은 `openai/gpt-oss-20b`다. 로컬 `.env.local`과 Vercel Production 변수는 별개다.
변수 변경 후 새 운영 배포가 필요하다.

## 질문 창구

- 새 질문을 올리면 Groq로 첫 AI 답변을 요청한다. AI 장애 시에도 질문은 저장한다.
- 질문 안의 **AI에게 질문하기** 입력창에서 후속 프롬프트를 보낸다. 원래 질문·첫 답변과
  최근 10개 AI 대화를 참고한다. 파티원 댓글과 프로필·Drive 데이터는 보내지 않는다.
- **파티원 댓글**은 AI 대화와 별도로 저장한다. 질문과 AI 대화·댓글은 같은 파티원이 볼 수 있다.
- AI 대화는 서버만 기록하며, 부모 질문의 1년 보관 기간이 지나면 함께 삭제된다.
- AI 응답 실패 시 입력 내용이 남으므로 다시 시도할 수 있다. 키가 없을 때 안내를 답변으로 저장하지 않는다.
- Groq의 데이터 보관 조건과 ZDR 설정은 운영 조직에서 확인한다. 개인정보처리방침에
  Groq 전달 항목·목적·처리 위치·보관 조건을 안내한다.

## 1년 기록 정리

- `GET /api/cron/retention`, 매일 UTC 00:00(한국 09:00) 예약. 무료 요금제 실행 시각에는
  오차가 있을 수 있다. Vercel이 `CRON_SECRET`을 Bearer 헤더로 전달한다.
- UTC DB 시각에서 달력상 1년을 뺀 시각 이하의 기록을 삭제한다. 최근 수정으로 기간을
  연장하지 않는다. 질문/학습 기록의 하위 AI 대화·답글·반응은 부모와 함께 더 일찍 삭제될 수 있다.
- 계정·파티·목표 설정과 공용 학습 자료는 제외한다. 개인/기존 Google Drive 원본은 유지한다.
- 기존 Supabase 사진은 DB 기록 정리와 같은 트랜잭션에서 비공개 파일 정리 목록에 등록한다.
  매 실행 최대 50개를 처리한다. 실패하면 남겨 두고, 중단된 작업은 5분 후 다시 처리할 수 있다.
- `retention_completed` 로그는 테이블별 건수·파일 성공/실패 건수만 기록한다.
  `retention_failed`, HTTP 503 또는 `filesFailed > 0`이면 설정·DB·Storage 상태를 확인한다.
  미처리 파일은 `retention_file_cleanup`에 남는다. 경로는 공개 로그에 출력하지 않는다.
- 기본 RPC 호출은 **삭제하지 않는 미리보기**다:
  `select public.purge_expired_records();`
  실행은 service_role/DB 운영자만 가능하다. `false`를 명시하면 실제 삭제한다.
- 첫 실행 및 변경 후 미리보기 건수를 확인한다. 반복 실행은 안전하며 DB 정리는
  트랜잭션 잠금, 파일 정리는 처리 권한 임대로 중복 처리를 방지한다.
- 삭제 후 복구를 위해 백업을 복원할 때는 서비스 공개 전에 만료 기록 정리를 다시 수행한다.

## 확인

로그인 쿠키 없이 `/`는 `/login`으로 이동하고, `/login`, `/privacy`, `/terms`가 HTTP 200인지 확인한다.
본인 계정으로 Google 로그인 → Drive 연결 → 사진 업로드 → 같은 파티의 다른 계정에서
앱 내 사진 조회 → 연결 해제 후 조회 제한을 확인한다. 다른 파티는 조회할 수 없어야 한다.
실제 계정 동의와 사진 선택은 계정 소유자가 수행한다.

## 근거

- https://support.google.com/cloud/answer/13464323
- https://support.google.com/cloud/answer/15549945
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://vercel.com/docs/cron-jobs/manage-cron-jobs

## 일일 RC 테스트

- 테스트 또는 홈의 **Part 5·6·7 · 총 3문항**에서 시작한다. 기존 단어 연습은 별도다.
- Groq가 실제 기출을 복제하지 않은 새 연습 문제를 만든다. Part 6은 한 지문·빈칸 1개, Part 7은 지문·질문 1개로 축소한다.
- 파티별 한국 날짜당 한 세트를 저장·재사용한다. 동시 생성에는 DB 생성권을 사용하며, 실패하면 다시 시도할 수 있다.
- 생성 요청에는 날짜와 출제 지침만 보낸다. 계정 정보, 선택한 답, 파티원 데이터는 Groq에 보내지 않는다.
- 보기 4개, 중복 보기, 파트 구성, 지문 및 빈칸 수를 검사한다. AI가 작성한 문제의 의미와 정답 정확성을 완전히 보증하지는 않는다.
- 제출 전 정답·해설은 서버에 보관한다. 제출 시 DB 정답으로 채점하고 결과와 RC 학습 기록을 한 트랜잭션으로 저장한다. 첫 제출 결과를 유지하며 재접속 시 다시 볼 수 있다.
- 날짜가 지난 미제출 문제는 새로 제출할 수 없다. 저장된 문제와 결과는 세트 생성일부터 1년 후 일일 정리 작업에서 함께 삭제한다.
