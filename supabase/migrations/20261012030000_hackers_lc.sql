-- 기존 RC 데이터와 읽기 권한을 유지하며 LC 분류를 추가한다.
alter table public.hackers_rc_reports add column category text not null default 'rc' check(category in ('rc','lc'));
create index hackers_reports_category_idx on public.hackers_rc_reports(party_id,category,created_at desc);
create function public.record_hackers_report(p_category text,p_id uuid,p_party uuid,p_user uuid,p_test_date date,p_total int,p_correct int,p_rows jsonb,p_method text,p_file text,p_mime text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_report public.hackers_rc_reports; v_log uuid;
begin
  if p_category is null or p_category not in ('rc','lc') then raise exception 'invalid_category'; end if;
  if not exists(select 1 from public.party_members where party_id=p_party and user_id=p_user) then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into v_report from public.hackers_rc_reports where id=p_id;
  if found then
    if v_report.user_id<>p_user or v_report.party_id<>p_party or v_report.category<>p_category then raise exception 'forbidden'; end if;
    return to_jsonb(v_report)||jsonb_build_object('inserted',false);
  end if;
  if p_file is null or length(p_file)=0 or p_mime not in ('image/png','image/jpeg','image/webp') then raise exception 'invalid_file'; end if;
  insert into public.study_logs(party_id,user_id,category,amount,note)
    values(p_party,p_user,p_category::public.study_category,p_total,'해커스 '||upper(p_category)||' 채점표 제출 · 제출자 확인') returning id into v_log;
  insert into public.study_evidences(study_log_id,drive_file_id,drive_owner_id,mime_type)
    values(v_log,p_file,p_user,p_mime);
  insert into public.hackers_rc_reports(category,id,party_id,user_id,study_log_id,test_date,total,correct,rows,method)
    values(p_category,p_id,p_party,p_user,v_log,p_test_date,p_total,p_correct,p_rows,p_method) returning * into v_report;
  return to_jsonb(v_report)||jsonb_build_object('inserted',true);
end;
$$;
revoke all on function public.record_hackers_report(text,uuid,uuid,uuid,date,int,int,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.record_hackers_report(text,uuid,uuid,uuid,date,int,int,jsonb,text,text,text) to service_role;

-- 배포 전 RC 클라이언트 및 기존 테스트의 호출도 유지한다.
create or replace function public.record_hackers_rc(p_id uuid,p_party uuid,p_user uuid,p_test_date date,p_total int,p_correct int,p_rows jsonb,p_method text,p_file text,p_mime text)
returns jsonb language sql security definer set search_path=public as $$
  select public.record_hackers_report('rc',p_id,p_party,p_user,p_test_date,p_total,p_correct,p_rows,p_method,p_file,p_mime);
$$;
