\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name='테스트 파티' \gset
select set_config('test.report_party',:'party_id',true);
set local role service_role;
select public.record_hackers_rc('92000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,7,5,'[{"number":1,"selected":"A","correctAnswer":"A","result":"correct"}]','ocr-reviewed','report-file','image/png');
select public.record_hackers_rc('92000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,7,7,'[]','manual','duplicate-file','image/png');
reset role;
do $$ begin
  if (select count(*) from public.hackers_rc_reports where id='92000000-0000-4000-8000-000000000001' and correct=5) <> 1 then raise exception 'duplicate changed report'; end if;
  if (select count(*) from public.study_evidences where drive_file_id in ('report-file','duplicate-file')) <> 1 then raise exception 'duplicate evidence'; end if;
  if not exists(select from public.study_logs l join public.hackers_rc_reports r on r.study_log_id=l.id where r.id='92000000-0000-4000-8000-000000000001' and l.category='rc' and l.amount=7) then raise exception 'RC log missing'; end if;
  begin perform public.record_hackers_rc('92000000-0000-4000-8000-000000000002',current_setting('test.report_party')::uuid,'33333333-3333-4333-8333-333333333333',current_date,7,5,'[]','manual','x','image/png'); raise exception 'outsider saved'; exception when raise_exception then if sqlerrm<>'forbidden' then raise; end if; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if (select count(*) from public.hackers_rc_reports where id='92000000-0000-4000-8000-000000000001')<>1 then raise exception 'party cannot read'; end if;
  begin delete from public.hackers_rc_reports; raise exception 'client can delete reports'; exception when insufficient_privilege then null; end;
  begin perform public.record_hackers_rc('92000000-0000-4000-8000-000000000003',current_setting('test.report_party')::uuid,auth.uid(),current_date,7,5,'[]','manual','x','image/png'); raise exception 'client can attach file'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin if exists(select from public.hackers_rc_reports where id='92000000-0000-4000-8000-000000000001') then raise exception 'outsider read'; end if; end $$;
reset role;
update public.study_logs set created_at=now()-interval '1 year'-interval '1 second' where id=(select study_log_id from public.hackers_rc_reports where id='92000000-0000-4000-8000-000000000001');
select public.purge_expired_records(false);
do $$ begin if exists(select from public.hackers_rc_reports where id='92000000-0000-4000-8000-000000000001') then raise exception 'report retention failed'; end if; end $$;
rollback;
select 'PASS: report persistence, duplicate protection, party access, server-only file attachment, retention';
