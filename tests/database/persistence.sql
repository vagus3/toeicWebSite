\set ON_ERROR_STOP on
insert into auth.users(id,email,raw_user_meta_data)
values('44444444-4444-4444-8444-444444444444','oauth@test.invalid',
  '{"name":"A very long Google profile display name","track":"unexpected"}');
do $$ begin
  if (select char_length(nickname) from public.profiles where id = '44444444-4444-4444-8444-444444444444') <> 20 then
    raise exception 'OAuth name not normalized';
  end if;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values
('11111111-1111-4111-8111-111111111111','owner@test.invalid','{"nickname":"운영자"}'),
('22222222-2222-4222-8222-222222222222','member@test.invalid','{"nickname":"파티원"}'),
('33333333-3333-4333-8333-333333333333','outsider@test.invalid','{"nickname":"외부인"}');
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.create_study_party('테스트 파티','2026-10-25',2) as party_id \gset
select public.study_party_invite(:'party_id') as invite_code \gset
select set_config('test.party_id', :'party_id', false);
select set_config('test.invite_code', :'invite_code', false);
do $$ begin
  if (select count(*) from public.chat_room_members) <> 1 then raise exception 'owner room membership missing'; end if;
  begin
    perform public.join_study_party('invalid-code');
    raise exception 'invalid invite accepted';
  exception when others then if sqlerrm <> 'invalid_invite' then raise; end if; end;
end $$;
set role anon;
select set_config('request.jwt.claim.sub','',false);
do $$ begin
  if (select count(*) from public.preview_party_invite(current_setting('test.invite_code'))) <> 1 then raise exception 'preview missing'; end if;
  begin
    perform public.join_study_party(current_setting('test.invite_code'));
    raise exception 'anonymous join accepted';
  exception when insufficient_privilege then null; end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.join_study_party(:'invite_code');
select public.join_study_party(:'invite_code');
do $$ begin
  if (select count(*) from public.party_members) <> 2 then raise exception 'join not idempotent'; end if;
  if (select count(*) from public.chat_room_members) <> 2 then raise exception 'chat membership missing'; end if;
end $$;
insert into public.quiz_attempts(party_id,user_id,kind,score,lc_score,rc_score)
values(:'party_id',auth.uid(),'weekly',755,370,385);
insert into public.questions(party_id,user_id,tag,title,ai_answer)
values(:'party_id',auth.uid(),'문법','현재완료 설명 부탁해요','테스트 답변') returning id as question_id \gset
insert into public.question_replies(question_id,user_id,body) values(:'question_id',auth.uid(),'보충 답변');
select public.record_daily_quiz(:'party_id',2,'[0,1,2]');
select public.record_study_evidence(:'party_id','rc',null,'image/png', :'party_id' || '/' || auth.uid() || '/2026-10-11/test.png') as log_id \gset
insert into storage.objects(bucket_id,name) values('study-evidence', :'party_id' || '/' || auth.uid() || '/2026-10-11/test.png');
insert into public.reactions(study_log_id,user_id,type) values(:'log_id',auth.uid(),'cheer') on conflict do nothing;
insert into public.nudges(party_id,sender_id,receiver_id) values(:'party_id',auth.uid(),'11111111-1111-4111-8111-111111111111');
-- 새로운 세션에서도 DB의 값이 남아 있는지 확인한다.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ declare v_count int; begin
  if (select count(*) from public.quiz_attempts) <> 2 then raise exception 'scores not persisted'; end if;
  if (select count(*) from public.questions) <> 1 or (select count(*) from public.question_replies) <> 1 then raise exception 'questions not persisted'; end if;
  if (select count(*) from public.study_evidences) <> 1 then raise exception 'evidence not persisted'; end if;
  select count(*) into v_count from public.study_logs;
  begin
    perform public.record_study_evidence(current_setting('test.party_id')::uuid,'lc',null,'image/png',null);
    raise exception 'invalid evidence accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.study_logs) <> v_count then raise exception 'partial log not rolled back'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
  if (select count(*) from public.study_logs) <> 0 or (select count(*) from public.questions) <> 0 then raise exception 'outsider data leak'; end if;
  if (select count(*) from storage.objects) <> 0 then raise exception 'outsider photo leak'; end if;
  begin
    perform public.join_study_party(current_setting('test.invite_code'));
    raise exception 'capacity exceeded';
  exception when others then if sqlerrm <> 'party_full' then raise; end if; end;
  begin
    insert into storage.objects(bucket_id,name) values('study-evidence', current_setting('test.party_id') || '/' || auth.uid() || '/test.png');
    raise exception 'outsider photo accepted';
  exception when insufficient_privilege then null; end;
end $$;
select 'PASS: invite, capacity, idempotency, chat membership, persistence, RLS, photo access, transaction rollback';
