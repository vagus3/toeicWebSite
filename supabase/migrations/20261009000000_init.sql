-- 새벽 토익 — 초기 스키마
-- 사용자·파티·목표·학습 기록·인증 사진·응원·테스트·채팅·푸시
-- 모든 파티 데이터는 party_members 기준 RLS로 파티원만 읽고 쓴다.

create extension if not exists "pgcrypto";

-- ───────────────────────── enum ─────────────────────────
create type study_category as enum ('word', 'lc', 'rc', 'book');
create type party_role as enum ('owner', 'member');
create type reaction_type as enum ('cheer', 'like', 'fire');
create type quiz_kind as enum ('daily', 'weekly', 'monthly');
create type chat_room_type as enum ('party', 'dm');
create type chat_message_type as enum ('text', 'image', 'system');

-- ───────────────────────── 사용자 · 파티 ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  avatar_url text,
  current_score int check (current_score between 10 and 990),
  target_score int check (target_score between 10 and 990),
  track text check (track in ('700', '800', '900+')),
  created_at timestamptz not null default now()
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  owner_id uuid not null references public.profiles (id),
  capacity int not null default 6 check (capacity between 2 and 20),
  invite_code_hash text not null unique,
  exam_date date,
  created_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role party_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);
create index party_members_user_idx on public.party_members (user_id);

-- 파티원 여부 (RLS에서 반복 사용) — security definer로 재귀 RLS 방지
create function public.is_party_member(p_party uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.party_members where party_id = p_party and user_id = auth.uid());
$$;

-- ───────────────────────── 목표 · 학습 기록 ─────────────────────────
create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category study_category not null,
  target_value int not null check (target_value > 0),
  unit text not null,
  weight numeric not null default 1 check (weight > 0),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

-- study_date는 한국 시간 기준 학습일, created_at은 실제 기록 시각
create table public.study_logs (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category study_category not null,
  amount int not null default 0 check (amount >= 0),
  minutes int check (minutes >= 0),
  study_date date not null default (now() at time zone 'Asia/Seoul')::date,
  note text,
  created_at timestamptz not null default now()
);
create index study_logs_party_date_idx on public.study_logs (party_id, study_date);

create table public.study_evidences (
  id uuid primary key default gen_random_uuid(),
  study_log_id uuid not null references public.study_logs (id) on delete cascade,
  drive_file_id text not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now()
);

-- ───────────────────────── 응원 · 콕 찌르기 ─────────────────────────
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  study_log_id uuid not null references public.study_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type reaction_type not null default 'cheer',
  created_at timestamptz not null default now(),
  unique (study_log_id, user_id, type)
);

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  nudge_date date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now(),
  check (sender_id <> receiver_id),
  -- 하루에 같은 사람에게 한 번만
  unique (party_id, sender_id, receiver_id, nudge_date)
);

-- ───────────────────────── 테스트 · 단어 · 일정 ─────────────────────────
create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  word text not null,
  meaning text not null,
  example text,
  day int,
  created_at timestamptz not null default now()
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  kind quiz_kind not null,
  title text not null,
  opens_on date not null,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  prompt text not null,
  options text[] not null,
  answer_index int not null,
  explanation text
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes (id) on delete set null,
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind quiz_kind not null,
  score int not null,
  lc_score int check (lc_score between 0 and 495),
  rc_score int check (rc_score between 0 and 495),
  taken_on date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now()
);

create table public.quiz_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  chosen_index int not null,
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

create table public.exam_schedules (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties (id) on delete cascade,
  exam_date date not null,
  registration_deadline date,
  label text not null
);

-- ───────────────────────── 질문 창구 ─────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag text not null,
  title text not null,
  ai_answer text,
  created_at timestamptz not null default now()
);

create table public.question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 채팅 · 알림 ─────────────────────────
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  type chat_room_type not null default 'party',
  created_at timestamptz not null default now()
);

create table public.chat_room_members (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted_until timestamptz,
  primary key (room_id, user_id)
);

create function public.is_room_member(p_room uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.chat_room_members where room_id = p_room and user_id = auth.uid());
$$;

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  message_type chat_message_type not null default 'text',
  client_id uuid unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index chat_messages_room_created_idx on public.chat_messages (room_id, created_at desc);

-- 사용자별 · 기기별 구독 (서버만 조회)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  chat_enabled boolean not null default true,
  preview_enabled boolean not null default true,
  quiet_hours int4range
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 운영자 Drive 연결 — 서버 전용(RLS 정책 없음 = 클라이언트 접근 불가)
create table public.drive_connections (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  encrypted_refresh_token text not null,
  folder_id text not null,
  updated_at timestamptz not null default now()
);

-- 읽지 않은 메시지 수
create view public.chat_unread_counts with (security_invoker = true) as
select m.room_id, m.user_id, count(c.id)::int as unread
from public.chat_room_members m
left join public.chat_messages c
  on c.room_id = m.room_id and c.created_at > m.last_read_at and c.sender_id <> m.user_id and c.deleted_at is null
group by m.room_id, m.user_id;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.study_goals enable row level security;
alter table public.study_logs enable row level security;
alter table public.study_evidences enable row level security;
alter table public.reactions enable row level security;
alter table public.nudges enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.exam_schedules enable row level security;
alter table public.questions enable row level security;
alter table public.question_replies enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.drive_connections enable row level security;

-- 프로필: 같은 파티원끼리 조회, 본인만 수정
create policy "profiles: self or party mates read" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.party_members a join public.party_members b on a.party_id = b.party_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);
create policy "profiles: self insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: self update" on public.profiles for update using (id = auth.uid());

create policy "parties: members read" on public.parties for select using (public.is_party_member(id));
create policy "parties: owner update" on public.parties for update using (owner_id = auth.uid());
create policy "parties: create own" on public.parties for insert with check (owner_id = auth.uid());

create policy "party_members: members read" on public.party_members for select using (public.is_party_member(party_id));
create policy "party_members: leave self" on public.party_members for delete using (user_id = auth.uid());
-- 참가는 초대 코드를 검증하는 서버(/api/parties/join, service role)에서만

create policy "goals: party read" on public.study_goals for select using (public.is_party_member(party_id));
create policy "goals: own write" on public.study_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_party_member(party_id));

create policy "logs: party read" on public.study_logs for select using (public.is_party_member(party_id));
create policy "logs: own write" on public.study_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_party_member(party_id));

create policy "evidences: party read" on public.study_evidences for select using (
  exists (select 1 from public.study_logs l where l.id = study_log_id and public.is_party_member(l.party_id))
);
create policy "evidences: own insert" on public.study_evidences for insert with check (
  exists (select 1 from public.study_logs l where l.id = study_log_id and l.user_id = auth.uid())
);

create policy "reactions: party read" on public.reactions for select using (
  exists (select 1 from public.study_logs l where l.id = study_log_id and public.is_party_member(l.party_id))
);
create policy "reactions: own write" on public.reactions for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.study_logs l where l.id = study_log_id and public.is_party_member(l.party_id))
);

create policy "nudges: involved read" on public.nudges for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "nudges: send in party" on public.nudges for insert with check (sender_id = auth.uid() and public.is_party_member(party_id));

create policy "vocab: own or party" on public.vocabulary_items for select using (user_id = auth.uid() or (party_id is not null and public.is_party_member(party_id)));
create policy "vocab: own write" on public.vocabulary_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "quizzes: party read" on public.quizzes for select using (public.is_party_member(party_id));
create policy "quiz_questions: party read" on public.quiz_questions for select using (
  exists (select 1 from public.quizzes q where q.id = quiz_id and public.is_party_member(q.party_id))
);
create policy "attempts: party read" on public.quiz_attempts for select using (public.is_party_member(party_id));
create policy "attempts: own insert" on public.quiz_attempts for insert with check (user_id = auth.uid() and public.is_party_member(party_id));
create policy "answers: own" on public.quiz_answers for all using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid())
) with check (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.user_id = auth.uid())
);

create policy "exams: read" on public.exam_schedules for select using (party_id is null or public.is_party_member(party_id));

create policy "questions: party read" on public.questions for select using (public.is_party_member(party_id));
create policy "questions: own insert" on public.questions for insert with check (user_id = auth.uid() and public.is_party_member(party_id));
create policy "replies: party read" on public.question_replies for select using (
  exists (select 1 from public.questions q where q.id = question_id and public.is_party_member(q.party_id))
);
create policy "replies: own insert" on public.question_replies for insert with check (
  user_id = auth.uid() and exists (select 1 from public.questions q where q.id = question_id and public.is_party_member(q.party_id))
);

create policy "rooms: members read" on public.chat_rooms for select using (public.is_room_member(id));
create policy "room_members: room read" on public.chat_room_members for select using (public.is_room_member(room_id));
create policy "room_members: own update" on public.chat_room_members for update using (user_id = auth.uid());

create policy "messages: room read" on public.chat_messages for select using (public.is_room_member(room_id));
create policy "messages: room send" on public.chat_messages for insert with check (sender_id = auth.uid() and public.is_room_member(room_id));
create policy "messages: own soft delete" on public.chat_messages for update using (sender_id = auth.uid());

create policy "push: own" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "prefs: own" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: own" on public.notifications for select using (receiver_id = auth.uid());
create policy "notifications: mark read" on public.notifications for update using (receiver_id = auth.uid());

-- ───────────────────────── Realtime (Broadcast, 비공개 채널) ─────────────────────────
-- 새 메시지를 room:<id>:messages 토픽으로 브로드캐스트
create function public.broadcast_chat_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || new.room_id::text || ':messages',
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end;
$$;

create trigger chat_messages_broadcast
after insert on public.chat_messages
for each row execute function public.broadcast_chat_message();

-- 채팅방 멤버만 해당 토픽을 구독할 수 있다
create policy "room members receive broadcasts" on realtime.messages for select to authenticated using (
  realtime.topic() like 'room:%:messages'
  and public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid)
);

-- ───────────────────────── 가입 시 프로필 자동 생성 ─────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, avatar_url, track)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'track'
  );
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
