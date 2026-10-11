\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name='테스트 파티' \gset
select set_config('test.review_party',:'party_id',true);

-- 파티원은 자기 복습 상태를 기록하고 다시 바꿀 수 있다 (PostgREST upsert와 같은 형태).
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into public.review_notes(user_id,party_id,source,source_ref,item_number,reviewed_at,updated_at)
  values(auth.uid(),current_setting('test.review_party')::uuid,'daily_rc','94000000-0000-4000-8000-000000000001',1,now(),now())
  on conflict(user_id,source,source_ref,item_number) do update set user_id=excluded.user_id,party_id=excluded.party_id,
    source=excluded.source,source_ref=excluded.source_ref,item_number=excluded.item_number,reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at;
insert into public.review_notes(user_id,party_id,source,source_ref,item_number,reviewed_at,updated_at)
  values(auth.uid(),current_setting('test.review_party')::uuid,'daily_rc','94000000-0000-4000-8000-000000000001',1,null,now())
  on conflict(user_id,source,source_ref,item_number) do update set user_id=excluded.user_id,party_id=excluded.party_id,
    source=excluded.source,source_ref=excluded.source_ref,item_number=excluded.item_number,reviewed_at=excluded.reviewed_at,updated_at=excluded.updated_at;
do $$ begin
  if (select count(*) from public.review_notes)<>1 or (select reviewed_at from public.review_notes) is not null then raise exception 'own review state not updated'; end if;
  -- 추출한 문제는 서버만 쓴다
  begin
    insert into public.review_notes(user_id,party_id,source,source_ref,item_number,content)
      values(auth.uid(),current_setting('test.review_party')::uuid,'hackers_rc','94000000-0000-4000-8000-000000000002',3,'{"question":"x"}');
    raise exception 'client wrote extracted content';
  exception when insufficient_privilege then null; end;
  begin
    update public.review_notes set content='{"question":"x"}';
    raise exception 'client updated extracted content';
  exception when insufficient_privilege then null; end;
  -- 남의 오답노트에 기록하지 못한다
  begin
    insert into public.review_notes(user_id,party_id,source,source_ref,item_number,reviewed_at)
      values('11111111-1111-4111-8111-111111111111',current_setting('test.review_party')::uuid,'word','94000000-0000-4000-8000-000000000003',1,now());
    raise exception 'wrote another user''s review';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 서버가 해커스 문제를 채우면 본인만 읽는다.
set local role service_role;
insert into public.review_notes(user_id,party_id,source,source_ref,item_number,content)
  values('22222222-2222-4222-8222-222222222222',current_setting('test.review_party')::uuid,'hackers_rc','94000000-0000-4000-8000-000000000002',3,'{"question":"Q3"}');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare v_deleted int; begin
  if exists(select from public.review_notes) then raise exception 'another member read private review notes'; end if;
  delete from public.review_notes;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 0 then raise exception 'another member deleted review notes'; end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  begin
    insert into public.review_notes(user_id,party_id,source,source_ref,item_number,reviewed_at)
      values(auth.uid(),current_setting('test.review_party')::uuid,'word','94000000-0000-4000-8000-000000000004',1,now());
    raise exception 'outsider wrote review for party';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if (select content->>'question' from public.review_notes where source='hackers_rc')<>'Q3' then raise exception 'owner cannot read extracted content'; end if;
end $$;
reset role;

update public.review_notes set created_at=now()-interval '1 year'-interval '1 second' where source='daily_rc';
select public.purge_expired_records(false);
do $$ begin
  if exists(select from public.review_notes where source='daily_rc') then raise exception 'review retention failed'; end if;
  if not exists(select from public.review_notes where source='hackers_rc') then raise exception 'recent review note purged'; end if;
end $$;
rollback;
select 'PASS: private review notes, server-only content and retention';
