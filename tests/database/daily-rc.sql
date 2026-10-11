\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name='테스트 파티' \gset
select set_config('test.rc_party', :'party_id', true);
insert into public.daily_rc_sets(id,party_id,study_date,questions)
values('91000000-0000-4000-8000-000000000001',:'party_id',(now() at time zone 'Asia/Seoul')::date,
 '[{"answer":0},{"answer":1},{"answer":2}]');
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  begin perform 1 from public.daily_rc_sets; raise exception 'answers exposed'; exception when insufficient_privilege then null; end;
  begin perform public.submit_daily_rc('91000000-0000-4000-8000-000000000001',auth.uid(),'[0,1,2]'); raise exception 'client may grade'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare r jsonb; begin
  r:=public.submit_daily_rc('91000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','[0,1,0]');
  if (r->>'score')::int <> 2 then raise exception 'incorrect score'; end if;
  r:=public.submit_daily_rc('91000000-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222','[0,1,2]');
  if (r->>'score')::int <> 2 then raise exception 'duplicate submission changed score'; end if;
  if (select count(*) from public.daily_rc_attempts) <> 1 then raise exception 'duplicate attempts'; end if;

  begin perform public.submit_daily_rc('91000000-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333','[0,1,2]'); raise exception 'outsider submitted'; exception when raise_exception then if sqlerrm <> 'forbidden' then raise; end if; end;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.study_logs where party_id=current_setting('test.rc_party')::uuid and user_id='22222222-2222-4222-8222-222222222222' and category='rc' and study_date=(now() at time zone 'Asia/Seoul')::date) <> 1 then raise exception 'RC log missing or duplicate'; end if;
end $$;
update public.daily_rc_sets set study_date=(now() at time zone 'Asia/Seoul')::date-1;
do $$ begin
  begin perform public.submit_daily_rc('91000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','[0,1,2]'); raise exception 'expired quiz accepted'; exception when raise_exception then if sqlerrm <> 'quiz_expired' then raise; end if; end;
end $$;
update public.daily_rc_sets set created_at=now()-interval '1 year'-interval '1 second';
select public.purge_expired_records(true);
do $$ begin if not exists(select from public.daily_rc_sets where id='91000000-0000-4000-8000-000000000001') then raise exception 'dry run deleted RC'; end if; end $$;
select public.purge_expired_records(false);
do $$ begin if exists(select from public.daily_rc_sets where id='91000000-0000-4000-8000-000000000001') or exists(select from public.daily_rc_attempts where set_id='91000000-0000-4000-8000-000000000001') then raise exception 'RC retention failed'; end if; end $$;
rollback;
select 'PASS: RC answer isolation, server grading, duplicate protection, expiry, retention';
