\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name='테스트 파티' \gset
select set_config('test.lc_party',:'party_id',true);
set local role service_role;
select public.record_hackers_report('lc','93000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,5,4,'[]','manual','lc-file','image/png');
select public.record_hackers_report('lc','93000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,5,5,'[]','manual','duplicate-lc-file','image/png');
select public.record_hackers_rc('93000000-0000-4000-8000-000000000002',:'party_id','22222222-2222-4222-8222-222222222222',current_date,7,5,'[]','manual','legacy-rc-file','image/png');
reset role;
do $$ begin
  if not exists(select from public.hackers_rc_reports r join public.study_logs l on l.id=r.study_log_id where r.id='93000000-0000-4000-8000-000000000001' and r.category='lc' and l.category='lc' and r.correct=4) then raise exception 'LC category or duplicate protection failed'; end if;
  if not exists(select from public.hackers_rc_reports r join public.study_logs l on l.id=r.study_log_id where r.id='93000000-0000-4000-8000-000000000002' and r.category='rc' and l.category='rc') then raise exception 'legacy RC broken'; end if;
  if exists(select from public.study_evidences where drive_file_id='duplicate-lc-file') then raise exception 'duplicate LC evidence'; end if;
  begin perform public.record_hackers_report('rc','93000000-0000-4000-8000-000000000001',current_setting('test.lc_party')::uuid,'22222222-2222-4222-8222-222222222222',current_date,7,5,'[]','manual','wrong-category','image/png'); raise exception 'reused category accepted'; exception when raise_exception then if sqlerrm<>'forbidden' then raise; end if; end;
  begin perform public.record_hackers_report('word','93000000-0000-4000-8000-000000000003',current_setting('test.lc_party')::uuid,'22222222-2222-4222-8222-222222222222',current_date,7,5,'[]','manual','wrong-category','image/png'); raise exception 'invalid category accepted'; exception when raise_exception then if sqlerrm<>'invalid_category' then raise; end if; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if (select count(*) from public.hackers_rc_reports where category='lc')<>1 then raise exception 'LC report unreadable'; end if;
  begin perform public.record_hackers_report('lc','93000000-0000-4000-8000-000000000004',current_setting('test.lc_party')::uuid,auth.uid(),current_date,5,4,'[]','manual','x','image/png'); raise exception 'client attached LC file'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.study_logs set created_at=now()-interval '1 year'-interval '1 second' where id=(select study_log_id from public.hackers_rc_reports where id='93000000-0000-4000-8000-000000000001');
select public.purge_expired_records(false);
do $$ begin if exists(select from public.hackers_rc_reports where id='93000000-0000-4000-8000-000000000001') then raise exception 'LC retention failed'; end if; end $$;
rollback;
select 'PASS: LC category, legacy RC, duplicate prevention, access and retention';
