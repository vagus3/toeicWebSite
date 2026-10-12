\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name = '테스트 파티' \gset
select id as room_id from public.chat_rooms where party_id = :'party_id' and type = 'party' order by created_at limit 1 \gset
select set_config('test.chat_room', :'room_id', true);

-- 인증 알림: 같은 날 같은 항목은 한 번만 알린다. 따로 넣어도, 한 문장에 두 줄을 넣어도 마찬가지다.
insert into public.study_logs(party_id,user_id,category,study_date,note)
values(:'party_id','11111111-1111-4111-8111-111111111111','book','2026-01-05','chat-event-a');
insert into public.study_logs(party_id,user_id,category,study_date,note)
values(:'party_id','11111111-1111-4111-8111-111111111111','book','2026-01-05','chat-event-b');
insert into public.study_logs(party_id,user_id,category,study_date,note) values
(:'party_id','11111111-1111-4111-8111-111111111111','lc','2026-01-06','chat-event-c'),
(:'party_id','11111111-1111-4111-8111-111111111111','lc','2026-01-06','chat-event-d');
-- 채팅방 멤버가 아닌 사람의 기록은 알리지 않는다 (운영자 권한으로 재현)
insert into public.study_logs(party_id,user_id,category,study_date,note)
values(:'party_id','33333333-3333-4333-8333-333333333333','rc','2026-01-05','chat-event-outsider');
select id as log_a from public.study_logs where note = 'chat-event-a' \gset
select set_config('test.log_a', :'log_a', true);
do $$ begin
  if (select count(*) from public.chat_messages m join public.study_logs l on l.id = m.study_log_id
      where l.note in ('chat-event-a','chat-event-b')) <> 1 then raise exception 'event not posted exactly once'; end if;
  if (select count(*) from public.chat_messages m join public.study_logs l on l.id = m.study_log_id
      where l.note in ('chat-event-c','chat-event-d')) <> 1 then raise exception 'multi-row insert not posted exactly once'; end if;
  if not exists (select 1 from public.chat_messages
      where study_log_id = current_setting('test.log_a')::uuid and message_type = 'system'
        and content = '교재 인증' and sender_id = '11111111-1111-4111-8111-111111111111') then raise exception 'event content or sender wrong'; end if;
  if exists (select 1 from public.chat_messages m join public.study_logs l on l.id = m.study_log_id
      where l.note = 'chat-event-outsider') then raise exception 'outsider event posted'; end if;
end $$;

-- 파티원은 일반 텍스트만 보낼 수 있다. AI 답변·시스템 메시지·답글 연결은 위조할 수 없다.
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into public.chat_messages(room_id,sender_id,content)
values(:'room_id',auth.uid(),'@AI 현재완료가 뭐야?') returning id as question_id \gset
select set_config('test.chat_question', :'question_id', true);
do $$ begin
  begin
    insert into public.chat_messages(room_id,sender_id,content,message_type)
    values(current_setting('test.chat_room')::uuid,auth.uid(),'forged AI answer','ai');
    raise exception 'client forged an AI message';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.chat_messages(room_id,sender_id,content,message_type)
    values(current_setting('test.chat_room')::uuid,auth.uid(),'forged event','system');
    raise exception 'client forged a system message';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.chat_messages(room_id,sender_id,content,reply_to)
    values(current_setting('test.chat_room')::uuid,auth.uid(),'forged reply',current_setting('test.chat_question')::uuid);
    raise exception 'client attached a reply';
  exception when insufficient_privilege then null; end;
  begin
    update public.chat_messages set content = 'edited' where id = current_setting('test.chat_question')::uuid;
    raise exception 'client edited message content';
  exception when insufficient_privilege then null; end;
  update public.chat_messages set deleted_at = now() where id = current_setting('test.chat_question')::uuid;
  if not found then raise exception 'own soft delete blocked'; end if;
  update public.chat_messages set deleted_at = null where id = current_setting('test.chat_question')::uuid;
end $$;

-- 서버는 질문 하나에 AI 답변 하나만 저장한다. AI 답변은 일반 메시지보다 길 수 있다.
set local role service_role;
insert into public.chat_messages(room_id,sender_id,content,message_type,reply_to)
values(:'room_id','22222222-2222-4222-8222-222222222222',repeat('설명 ',1000),'ai',:'question_id')
returning id as answer_id \gset
select set_config('test.chat_answer', :'answer_id', true);
do $$ begin
  begin
    insert into public.chat_messages(room_id,sender_id,content,message_type,reply_to)
    values(current_setting('test.chat_room')::uuid,'22222222-2222-4222-8222-222222222222','second answer','ai',current_setting('test.chat_question')::uuid);
    raise exception 'duplicate AI answer stored';
  exception when unique_violation then null; end;
  begin
    insert into public.chat_messages(room_id,sender_id,content)
    values(current_setting('test.chat_room')::uuid,'22222222-2222-4222-8222-222222222222',repeat('a',2001));
    raise exception 'long text message accepted';
  exception when check_violation then null; end;
end $$;

-- 확인은 같은 방의 AI 답변에만, 본인 이름으로만 남길 수 있다.
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.chat_ai_confirmations(message_id,room_id,user_id) values(:'answer_id',:'room_id',auth.uid());
do $$ begin
  begin
    insert into public.chat_ai_confirmations(message_id,room_id,user_id)
    values(current_setting('test.chat_question')::uuid,current_setting('test.chat_room')::uuid,auth.uid());
    raise exception 'confirmed a non-AI message';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.chat_ai_confirmations(message_id,room_id,user_id)
    values(current_setting('test.chat_answer')::uuid,current_setting('test.chat_room')::uuid,'22222222-2222-4222-8222-222222222222');
    raise exception 'confirmed on behalf of another member';
  exception when insufficient_privilege then null; end;
end $$;

-- 파티 밖 사람은 AI 답변과 확인을 읽거나 남길 수 없다.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  if (select count(*) from public.chat_ai_confirmations) <> 0 then raise exception 'outsider read confirmations'; end if;
  if (select count(*) from public.chat_messages where id = current_setting('test.chat_answer')::uuid) <> 0 then raise exception 'outsider read AI answer'; end if;
  begin
    insert into public.chat_ai_confirmations(message_id,room_id,user_id)
    values(current_setting('test.chat_answer')::uuid,current_setting('test.chat_room')::uuid,auth.uid());
    raise exception 'outsider confirmed';
  exception when insufficient_privilege then null; end;
end $$;

-- 질문한 사람(AI 답변의 sender)도 AI 답변 본문은 고칠 수 없고, 남의 확인은 지울 수 없다.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if (select count(*) from public.chat_ai_confirmations where message_id = current_setting('test.chat_answer')::uuid) <> 1 then
    raise exception 'member cannot read confirmation'; end if;
  begin
    update public.chat_messages set content = 'tampered' where id = current_setting('test.chat_answer')::uuid;
    raise exception 'asker edited the AI answer';
  exception when insufficient_privilege then null; end;
  delete from public.chat_ai_confirmations where user_id = '11111111-1111-4111-8111-111111111111';
  if (select count(*) from public.chat_ai_confirmations) <> 1 then raise exception 'removed another member confirmation'; end if;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
delete from public.chat_ai_confirmations where message_id = :'answer_id';
do $$ begin
  if (select count(*) from public.chat_ai_confirmations) <> 0 then raise exception 'own confirmation not removed'; end if;
end $$;

-- 질문이 지워지면 AI 답변과 확인도, 학습 기록이 지워지면 인증 알림도 함께 지운다.
reset role;
insert into public.chat_ai_confirmations(message_id,room_id,user_id) values(:'answer_id',:'room_id','11111111-1111-4111-8111-111111111111');
delete from public.chat_messages where id = :'question_id';
delete from public.study_logs where id = :'log_a';
do $$ begin
  if exists (select 1 from public.chat_messages where id = current_setting('test.chat_answer')::uuid) then raise exception 'AI answer survived its question'; end if;
  if exists (select 1 from public.chat_ai_confirmations) then raise exception 'confirmation survived its answer'; end if;
  if exists (select 1 from public.chat_messages where study_log_id = current_setting('test.log_a')::uuid) then raise exception 'event survived its study log'; end if;
end $$;
rollback;
select 'PASS: chat AI answers are server-only, study events post once, confirmations stay in the room';
