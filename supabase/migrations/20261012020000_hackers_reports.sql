create table public.hackers_rc_reports (
  id uuid primary key,
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_log_id uuid not null references public.study_logs(id) on delete cascade,
  test_date date not null,
  total int not null check(total between 1 and 200),
  correct int not null check(correct between 0 and total),
  rows jsonb not null check(jsonb_typeof(rows)='array' and jsonb_array_length(rows)<=200),
  method text not null check(method in ('ocr-reviewed','manual')),
  created_at timestamptz not null default now()
);
create index hackers_rc_reports_party_date_idx on public.hackers_rc_reports(party_id, created_at desc);
alter table public.hackers_rc_reports enable row level security;
revoke all on public.hackers_rc_reports from public, anon, authenticated;
grant select on public.hackers_rc_reports to authenticated;
grant all on public.hackers_rc_reports to service_role;
create policy "reports: party read" on public.hackers_rc_reports for select to authenticated using(public.is_party_member(party_id));

-- 확인한 결과·RC 인증·개인 Drive 파일 위치를 함께 저장한다. 같은 요청 ID는 재사용한다.
create function public.record_hackers_rc(p_id uuid,p_party uuid,p_user uuid,p_test_date date,p_total int,p_correct int,p_rows jsonb,p_method text,p_file text,p_mime text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_report public.hackers_rc_reports; v_log uuid;
begin
  if not exists(select 1 from public.party_members where party_id=p_party and user_id=p_user) then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into v_report from public.hackers_rc_reports where id=p_id;
  if found then
    if v_report.user_id<>p_user or v_report.party_id<>p_party then raise exception 'forbidden'; end if;
    return to_jsonb(v_report)||jsonb_build_object('inserted',false);
  end if;
  if p_file is null or length(p_file)=0 or p_mime not in ('image/png','image/jpeg','image/webp') then raise exception 'invalid_file'; end if;
  insert into public.study_logs(party_id,user_id,category,amount,note)
    values(p_party,p_user,'rc',p_total,'해커스 RC 채점표 제출 · 제출자 확인') returning id into v_log;
  insert into public.study_evidences(study_log_id,drive_file_id,drive_owner_id,mime_type)
    values(v_log,p_file,p_user,p_mime);
  insert into public.hackers_rc_reports(id,party_id,user_id,study_log_id,test_date,total,correct,rows,method)
    values(p_id,p_party,p_user,v_log,p_test_date,p_total,p_correct,p_rows,p_method) returning * into v_report;
  return to_jsonb(v_report)||jsonb_build_object('inserted',true);
end;
$$;
revoke all on function public.record_hackers_rc(uuid,uuid,uuid,date,int,int,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.record_hackers_rc(uuid,uuid,uuid,date,int,int,jsonb,text,text,text) to service_role;
-- 보고서가 학습 로그에 연결되므로 기존 1년 정리 작업이 파일 연결과 결과도 cascade 삭제한다.
