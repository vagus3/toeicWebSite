-- 파티 채팅의 @AI 답변, 인증 알림(시스템 메시지), AI 답변 확인.
-- AI 답변과 시스템 메시지는 서버·트리거만 만든다. 클라이언트는 일반 텍스트만 직접 보낼 수 있다.

alter table public.chat_messages
  -- AI 답변·실패 안내가 어느 질문에 대한 것인지
  add column reply_to uuid references public.chat_messages(id) on delete cascade,
  -- 인증 알림이 가리키는 학습 기록. 기록이 지워지면 알림도 지운다.
  add column study_log_id uuid references public.study_logs(id) on delete cascade;
create index chat_messages_reply_to_idx on public.chat_messages(reply_to) where reply_to is not null;
-- 같은 질문에 AI 답변이 두 번 저장되지 않게 한다 (요청 재시도·중복 실행 대비)
create unique index chat_messages_ai_reply_idx on public.chat_messages(reply_to) where message_type = 'ai';
create unique index chat_messages_study_log_idx on public.chat_messages(study_log_id) where study_log_id is not null;

-- AI 답변은 예문·구조 설명이 들어가 일반 메시지보다 길 수 있다.
alter table public.chat_messages drop constraint chat_messages_content_check;
alter table public.chat_messages add constraint chat_messages_content_check check (
  char_length(content) between 1 and case when message_type = 'ai' then 6000 else 2000 end
);

drop policy "messages: room send" on public.chat_messages;
create policy "messages: room send" on public.chat_messages for insert with check (
  sender_id = auth.uid() and public.is_room_member(room_id)
  and message_type = 'text' and reply_to is null and study_log_id is null
);
-- 본인 메시지는 삭제 표시만 바꿀 수 있다. AI 답변의 sender는 질문한 사람이라서,
-- 다른 열까지 열어 두면 질문자가 AI 답변 본문이나 종류를 고칠 수 있다.
revoke update on public.chat_messages from authenticated;
grant update (deleted_at) on public.chat_messages to authenticated;
-- AI 답변과 실패 안내는 서버(service role)가 쓴다.
grant select, insert on public.chat_messages to service_role;

-- ───────────────────────── AI 답변 확인 ─────────────────────────
create table public.chat_ai_confirmations (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.chat_ai_confirmations enable row level security;
revoke all on public.chat_ai_confirmations from public, anon, authenticated;
grant select, insert, delete on public.chat_ai_confirmations to authenticated;
create policy "ai confirmations: room read" on public.chat_ai_confirmations
  for select to authenticated using (public.is_room_member(room_id));
create policy "ai confirmations: own add" on public.chat_ai_confirmations
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_room_member(room_id)
    and exists (
      select 1 from public.chat_messages m
      where m.id = message_id and m.room_id = chat_ai_confirmations.room_id
        and m.message_type = 'ai' and m.deleted_at is null
    )
  );
create policy "ai confirmations: own remove" on public.chat_ai_confirmations
  for delete to authenticated using (user_id = auth.uid());

-- 확인을 누르거나 취소하면 같은 방 토픽으로 알려서, 열려 있는 채팅 화면이 다시 읽게 한다.
create function public.broadcast_chat_confirmation()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_room uuid;
begin
  if tg_op = 'DELETE' then v_room := old.room_id; else v_room := new.room_id; end if;
  perform realtime.broadcast_changes(
    'room:' || v_room::text || ':messages',
    tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end;
$$;
create trigger chat_ai_confirmations_broadcast
after insert or delete on public.chat_ai_confirmations
for each row execute function public.broadcast_chat_confirmation();

-- ───────────────────────── 인증 알림 ─────────────────────────
-- 사진 인증·단어 퀴즈·AI RC·해커스 채점표가 모두 study_logs를 만들므로 한 곳에서 알린다.
-- 같은 날 같은 항목은 한 번만 알린다. 푸시는 보내지 않는다.
-- 내용은 항목 라벨만 저장하고 "○○님이 … 인증을 올렸어요" 문장은 화면에서 만든다 (닉네임이 바뀌어도 맞게).
create function public.post_study_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_room uuid;
begin
  -- "다른 기록이 있는가"로 판단하면 한 문장에 같은 항목 두 줄이 들어올 때
  -- 두 줄이 서로를 보고 둘 다 건너뛴다. 이미 나간 알림이 있는지로 판단한다.
  if exists (
    select 1 from public.chat_messages m
    join public.study_logs l on l.id = m.study_log_id
    where l.party_id = new.party_id and l.user_id = new.user_id
      and l.category = new.category and l.study_date = new.study_date
  ) then
    return null;
  end if;
  select id into v_room from public.chat_rooms
    where party_id = new.party_id and type = 'party' order by created_at limit 1;
  if v_room is null or not exists (
    select 1 from public.chat_room_members where room_id = v_room and user_id = new.user_id
  ) then
    return null;
  end if;
  -- 알림 저장이 실패해도 인증 자체는 성공해야 한다.
  begin
    insert into public.chat_messages(room_id, sender_id, content, message_type, study_log_id)
    values (
      v_room, new.user_id,
      case new.category when 'word' then '단어' when 'lc' then 'LC' when 'rc' then 'RC' else '교재' end || ' 인증',
      'system', new.id
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;
revoke all on function public.post_study_event() from public;
create trigger study_logs_post_event
after insert on public.study_logs
for each row execute function public.post_study_event();
