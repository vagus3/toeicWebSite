\set ON_ERROR_STOP on
-- 별도 연결에서 개인 Drive 소유자와 파티별 사진 조회 권한을 확인한다.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select id as party_id from public.parties where name = '테스트 파티' \gset
select public.record_study_evidence(:'party_id', 'lc', 'private-google-file', 'image/png') as drive_log_id \gset
select set_config('test.drive_log_id', :'drive_log_id', false);
do $$ begin
  if (select drive_owner_id from public.study_evidences where study_log_id = current_setting('test.drive_log_id')::uuid) <> auth.uid() then
    raise exception 'wrong Drive owner';
  end if;
  begin
    perform encrypted_refresh_token from public.drive_connections;
    raise exception 'Drive credential exposed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.study_evidences(study_log_id,drive_file_id,drive_owner_id,mime_type)
    values(current_setting('test.drive_log_id')::uuid,'other-users-file','22222222-2222-4222-8222-222222222222','image/png');
    raise exception 'Drive owner spoof accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  if (select count(*) from public.study_evidences where study_log_id = current_setting('test.drive_log_id')::uuid) <> 1 then
    raise exception 'party member cannot view Drive evidence';
  end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
  if (select count(*) from public.study_evidences where study_log_id = current_setting('test.drive_log_id')::uuid) <> 0 then
    raise exception 'Drive evidence leaked outside party';
  end if;
end $$;
