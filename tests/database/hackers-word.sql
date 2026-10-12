\set ON_ERROR_STOP on
reset role;
begin;
select id as party_id from public.parties where name='테스트 파티' \gset
select set_config('test.word_party',:'party_id',true);
set local role service_role;
select public.record_hackers_report('word','95000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,1,0,
  '[{"number":1,"selected":"employer","correctAnswer":"employee","result":"incorrect"}]','manual','word-file','image/png');
select public.record_hackers_report('word','95000000-0000-4000-8000-000000000001',:'party_id','22222222-2222-4222-8222-222222222222',current_date,1,1,'[]','manual','duplicate-word-file','image/png');
reset role;
do $$ begin
  if not exists(select from public.hackers_rc_reports r join public.study_logs l on l.id=r.study_log_id
    where r.id='95000000-0000-4000-8000-000000000001' and r.category='word' and l.category='word' and r.correct=0
      and r.rows->0->>'correctAnswer'='employee') then raise exception 'word result or certification missing'; end if;
  if exists(select from public.study_evidences where drive_file_id='duplicate-word-file') then raise exception 'duplicate word evidence'; end if;
  begin
    perform public.record_hackers_report('rc','95000000-0000-4000-8000-000000000001',current_setting('test.word_party')::uuid,
      '22222222-2222-4222-8222-222222222222',current_date,1,0,'[]','manual','wrong-category','image/png');
    raise exception 'reused category accepted';
  exception when raise_exception then if sqlerrm<>'forbidden' then raise; end if; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into public.review_notes(user_id,party_id,source,source_ref,item_number,reviewed_at)
  values(auth.uid(),:'party_id','hackers_word','95000000-0000-4000-8000-000000000001',1,now());
do $$ begin
  if (select count(*) from public.hackers_rc_reports where category='word')<>1 then raise exception 'word report unreadable'; end if;
  if not exists(select from public.review_notes where source='hackers_word') then raise exception 'word review missing'; end if;
  begin
    perform public.record_hackers_report('word','95000000-0000-4000-8000-000000000002',current_setting('test.word_party')::uuid,
      auth.uid(),current_date,1,0,'[]','manual','client-file','image/png');
    raise exception 'client attached word file';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.study_logs set created_at=now()-interval '1 year'-interval '1 second'
  where id=(select study_log_id from public.hackers_rc_reports where id='95000000-0000-4000-8000-000000000001');
select public.purge_expired_records(false);
do $$ begin
  if exists(select from public.hackers_rc_reports where id='95000000-0000-4000-8000-000000000001') then raise exception 'word retention failed'; end if;
end $$;
rollback;
select 'PASS: word certification, written answers, duplicate prevention, review, access and retention';
