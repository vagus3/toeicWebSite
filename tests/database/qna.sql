\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name = '테스트 파티' \gset
insert into public.questions(id,party_id,user_id,tag,title)
values('90000000-0000-4000-8000-000000000001',:'party_id','11111111-1111-4111-8111-111111111111','문법','AI 대화 테스트');
set local role service_role;
insert into public.question_ai_turns(question_id,user_id,prompt,answer)
values('90000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','이유를 알려줘','예문과 함께 설명');
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if (select count(*) from public.question_ai_turns where question_id='90000000-0000-4000-8000-000000000001') <> 1 then raise exception 'party member cannot read AI turn'; end if;
  begin
    insert into public.question_ai_turns(question_id,user_id,prompt,answer)
    values('90000000-0000-4000-8000-000000000001',auth.uid(),'forge prompt','forge AI answer');
    raise exception 'client forged AI answer';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  if (select count(*) from public.question_ai_turns where question_id='90000000-0000-4000-8000-000000000001') <> 0 then raise exception 'outsider read AI turn'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.question_ai_turns; raise exception 'anonymous read AI turn'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.questions set created_at=now()-interval '1 year'-interval '1 second' where id='90000000-0000-4000-8000-000000000001';
select public.purge_expired_records(false);
do $$ begin
  if exists(select 1 from public.question_ai_turns where question_id='90000000-0000-4000-8000-000000000001') then raise exception 'expired question retained AI conversation'; end if;
end $$;
rollback;
select 'PASS: AI conversation membership, server-only writes, parent retention cascade';
