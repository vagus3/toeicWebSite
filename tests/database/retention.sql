\set ON_ERROR_STOP on
reset role;
begin;
set local timezone = 'UTC';
select id as party_id from public.parties where name = '테스트 파티' \gset
select id as room_id from public.chat_rooms where party_id = :'party_id' limit 1 \gset
select set_config('test.retention_party', :'party_id', true);
select :'party_id' || '/11111111-1111-4111-8111-111111111111/retention-test.png' as storage_path \gset
select set_config('test.retention_path', :'storage_path', true);

-- 경계: 365일 고정이 아니라 UTC 달력상 1년, 경계 자체도 삭제 대상이다.
insert into public.study_logs(party_id,user_id,category,created_at,note) values
(:'party_id','11111111-1111-4111-8111-111111111111','lc',now()-interval '1 year'-interval '1 microsecond','expired'),
(:'party_id','11111111-1111-4111-8111-111111111111','rc',now()-interval '1 year','boundary'),
(:'party_id','11111111-1111-4111-8111-111111111111','word',now()-interval '1 year'+interval '1 microsecond','fresh');
insert into public.study_evidences(study_log_id,storage_path,mime_type)
select id,:'storage_path','image/png' from public.study_logs where note='expired';
insert into storage.objects(bucket_id,name) values('study-evidence', :'storage_path');
-- 과거 잘못된 메타데이터를 운영자 권한으로 재현한다. 파일 정리에는 포함되면 안 된다.
insert into public.study_evidences(study_log_id,storage_path,mime_type)
select id,:'party_id' || '/22222222-2222-4222-8222-222222222222/foreign.png','image/png'
from public.study_logs where note='expired';
insert into storage.objects(bucket_id,name)
values('study-evidence', :'party_id' || '/22222222-2222-4222-8222-222222222222/foreign.png');
insert into public.study_evidences(study_log_id,drive_file_id,drive_owner_id,mime_type)
select id,'keep-drive-original','11111111-1111-4111-8111-111111111111','image/png'
from public.study_logs where note='boundary';
insert into public.reactions(study_log_id,user_id)
select id,'22222222-2222-4222-8222-222222222222' from public.study_logs where note='expired';
insert into public.questions(party_id,user_id,tag,title,created_at)
values(:'party_id','11111111-1111-4111-8111-111111111111','test','expired thread',now()-interval '1 year');
insert into public.question_replies(question_id,user_id,body)
select id,'22222222-2222-4222-8222-222222222222','recent reply to expired thread'
from public.questions where title='expired thread';
insert into public.chat_messages(room_id,sender_id,content,created_at) values
(:'room_id','11111111-1111-4111-8111-111111111111','expired message',now()-interval '1 year');
insert into public.quiz_attempts(party_id,user_id,kind,score,created_at)
values(:'party_id','11111111-1111-4111-8111-111111111111','weekly',700,now()-interval '1 year');
insert into public.vocabulary_items(word,meaning,created_at,user_id) values
('personal-old','test',now()-interval '1 year','11111111-1111-4111-8111-111111111111'),
('shared-old','test',now()-interval '1 year',null);
insert into public.drive_connections(owner_id,encrypted_refresh_token,folder_id)
values('11111111-1111-4111-8111-111111111111','untouched-token','untouched-folder');

do $$ declare v_result jsonb; begin
  if '2024-02-29 09:00:00+00'::timestamptz - interval '1 year' <> '2023-02-28 09:00:00+00'::timestamptz then
    raise exception 'calendar year boundary mismatch';
  end if;
  v_result := public.purge_expired_records();
  if (v_result->'counts'->>'study_logs')::int <> 2 then raise exception 'wrong cutoff'; end if;
  if (v_result->'counts'->>'reactions')::int <> 1 then raise exception 'cascade count missing'; end if;
  if (select count(*) from public.study_logs where note in ('expired','boundary')) <> 2
    or exists(select from public.retention_file_cleanup) then raise exception 'dry run mutated data'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if (select count(*) from storage.objects where name=current_setting('test.retention_path')) <> 1 then
    raise exception 'live Storage photo unreadable'; end if;
  if exists(select from storage.objects where name like '%/foreign.png') then
    raise exception 'forged legacy path exposed foreign photo'; end if;
  begin
    insert into public.study_evidences(study_log_id,storage_path,mime_type)
      select id,current_setting('test.retention_party') || '/22222222-2222-4222-8222-222222222222/forged.png','image/png'
      from public.study_logs where note='expired';
    raise exception 'user can forge a Storage owner';
  exception when insufficient_privilege then null; end;
  begin perform public.purge_expired_records(false); raise exception 'user can purge';
  exception when insufficient_privilege then null; end;
  begin perform public.claim_retention_files(); raise exception 'user can claim';
  exception when insufficient_privilege then null; end;
  begin perform storage_path from public.retention_file_cleanup; raise exception 'queue exposed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform public.purge_expired_records(false); raise exception 'anonymous can purge';
  exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
select public.purge_expired_records(false);
reset role;
do $$ begin
  if exists(select from public.study_logs where note in ('expired','boundary'))
    or not exists(select from public.study_logs where note='fresh') then raise exception 'record boundary failed'; end if;
  if exists(select from public.questions where title='expired thread')
    or exists(select from public.question_replies where body='recent reply to expired thread') then raise exception 'thread cascade failed'; end if;
  if exists(select from public.chat_messages where content='expired message') then raise exception 'message retained'; end if;
  if exists(select from public.vocabulary_items where word='personal-old')
    or not exists(select from public.vocabulary_items where word='shared-old') then raise exception 'vocabulary scope failed'; end if;
  if (select count(*) from public.retention_file_cleanup) <> 1
    or not exists(select from public.retention_file_cleanup where storage_path=current_setting('test.retention_path')) then raise exception 'storage queue incorrect'; end if;
  if not exists(select from public.drive_connections where encrypted_refresh_token='untouched-token')
    or not exists(select from public.profiles where id='11111111-1111-4111-8111-111111111111')
    or not exists(select from public.parties where id=current_setting('test.retention_party')::uuid) then raise exception 'account state deleted'; end if;
  if (public.purge_expired_records(false)->'counts'->>'study_logs')::int <> 0 then raise exception 'purge not idempotent'; end if;
  if (select count(*) from public.claim_retention_files()) <> 1 then raise exception 'file not claimed'; end if;
  if (select count(*) from public.claim_retention_files()) <> 0 then raise exception 'file claimed twice'; end if;
  update public.retention_file_cleanup set claimed_until=now()-interval '1 second';
  if (select count(*) from public.claim_retention_files()) <> 1 then raise exception 'lease not retried'; end if;
end $$;
set local role authenticated;
do $$ begin
  if exists(select from storage.objects where name=current_setting('test.retention_path')) then
    raise exception 'expired Storage photo accessible before cleanup'; end if;
end $$;
rollback;
