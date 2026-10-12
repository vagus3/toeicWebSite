\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name = '테스트 파티' \gset
insert into public.questions(id,party_id,user_id,tag,title,ai_answer) values
('95000000-0000-4000-8000-000000000001',:'party_id','11111111-1111-4111-8111-111111111111','문법','확인 테스트','첫 답변'),
('95000000-0000-4000-8000-000000000002',:'party_id','11111111-1111-4111-8111-111111111111','문법','AI 답변 없는 질문',null);
set local role service_role;
insert into public.question_ai_turns(id,question_id,user_id,prompt,answer)
values('95000000-0000-4000-8000-000000000011','95000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','추가 질문','추가 답변');

-- 파티원은 첫 답변과 이어진 답변에 각각 한 번씩 확인을 남길 수 있다.
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into public.question_ai_confirmations(question_id,turn_id,user_id)
values('95000000-0000-4000-8000-000000000001',null,auth.uid());
insert into public.question_ai_confirmations(question_id,turn_id,user_id)
values('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000011',auth.uid());
do $$ begin
  begin
    insert into public.question_ai_confirmations(question_id,turn_id,user_id)
    values('95000000-0000-4000-8000-000000000001',null,auth.uid());
    raise exception 'duplicate first-answer confirmation';
  exception when unique_violation then null; end;
  begin
    insert into public.question_ai_confirmations(question_id,turn_id,user_id)
    values('95000000-0000-4000-8000-000000000002',null,auth.uid());
    raise exception 'confirmed a question without an AI answer';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.question_ai_confirmations(question_id,turn_id,user_id)
    values('95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000011',auth.uid());
    raise exception 'confirmed a turn under another question';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.question_ai_confirmations(question_id,turn_id,user_id)
    values('95000000-0000-4000-8000-000000000001',null,'11111111-1111-4111-8111-111111111111');
    raise exception 'confirmed on behalf of another member';
  exception when insufficient_privilege then null; end;
end $$;

-- 파티 밖 사람은 읽거나 남길 수 없다.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  if (select count(*) from public.question_ai_confirmations) <> 0 then raise exception 'outsider read confirmations'; end if;
  begin
    insert into public.question_ai_confirmations(question_id,turn_id,user_id)
    values('95000000-0000-4000-8000-000000000001',null,auth.uid());
    raise exception 'outsider confirmed';
  exception when insufficient_privilege then null; end;
end $$;

-- 다른 파티원은 확인을 읽을 수 있지만 지울 수는 없다.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if (select count(*) from public.question_ai_confirmations) <> 2 then raise exception 'member cannot read confirmations'; end if;
  delete from public.question_ai_confirmations where user_id = '22222222-2222-4222-8222-222222222222';
  if (select count(*) from public.question_ai_confirmations) <> 2 then raise exception 'removed another member confirmation'; end if;
end $$;

-- AI 대화나 질문이 지워지면 확인도 함께 지운다.
reset role;
delete from public.question_ai_turns where id = '95000000-0000-4000-8000-000000000011';
do $$ begin
  if (select count(*) from public.question_ai_confirmations) <> 1 then raise exception 'turn cascade failed'; end if;
end $$;
delete from public.questions where id = '95000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from public.question_ai_confirmations) then raise exception 'question cascade failed'; end if;
end $$;
rollback;
select 'PASS: question AI confirmations are per answer, party-only, own-only, and cascade';
