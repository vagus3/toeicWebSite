-- 정답은 서비스 역할만 조회한다. 브라우저에는 API가 문제 필드만 전달한다.
create table public.daily_rc_sets (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  study_date date not null,
  questions jsonb,
  claim_id uuid,
  claimed_until timestamptz not null default '1970-01-01',
  created_at timestamptz not null default now(),
  unique(party_id, study_date),
  check (questions is null or (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 3))
);
create table public.daily_rc_attempts (
  set_id uuid not null references public.daily_rc_sets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null,
  score integer not null check(score between 0 and 3),
  created_at timestamptz not null default now(),
  primary key(set_id,user_id)
);
alter table public.daily_rc_sets enable row level security;
alter table public.daily_rc_attempts enable row level security;
revoke all on public.daily_rc_sets, public.daily_rc_attempts from public, anon, authenticated;
grant all on public.daily_rc_sets, public.daily_rc_attempts to service_role;

-- 첫 제출만 기록하고 재전송에는 같은 결과를 반환한다. DB의 정답으로 채점한다.
create function public.submit_daily_rc(p_set uuid, p_user uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_set public.daily_rc_sets; v_attempt public.daily_rc_attempts; v_score int;
begin
  select * into v_set from public.daily_rc_sets where id=p_set for update;
  if not found or v_set.questions is null or not exists(
    select 1 from public.party_members where party_id=v_set.party_id and user_id=p_user
  ) then raise exception 'forbidden'; end if;
  select * into v_attempt from public.daily_rc_attempts where set_id=p_set and user_id=p_user;
  if found then return to_jsonb(v_attempt); end if;
  if v_set.study_date <> (now() at time zone 'Asia/Seoul')::date then raise exception 'quiz_expired'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 3 then raise exception 'invalid_answers'; end if;
  if exists(select 1 from jsonb_array_elements(p_answers) a where a not in ('0'::jsonb,'1'::jsonb,'2'::jsonb,'3'::jsonb)) then raise exception 'invalid_answers'; end if;
  select count(*) into v_score from jsonb_array_elements(v_set.questions) with ordinality q(value,n)
    where (q.value->>'answer')::int = (p_answers->>((q.n-1)::int))::int;
  insert into public.daily_rc_attempts(set_id,user_id,answers,score) values(p_set,p_user,p_answers,v_score) returning * into v_attempt;
  if not exists(select 1 from public.study_logs where party_id=v_set.party_id and user_id=p_user
    and category='rc' and study_date=v_set.study_date) then
    insert into public.study_logs(party_id,user_id,category,study_date,amount) values(v_set.party_id,p_user,'rc',v_set.study_date,3);
  end if;
  return to_jsonb(v_attempt);
end;
$$;
revoke all on function public.submit_daily_rc(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.submit_daily_rc(uuid,uuid,jsonb) to service_role;

-- 기존 1년 기록 정리 작업에 연결하여 문제·결과도 함께 삭제한다.
alter function public.purge_expired_records(boolean) rename to purge_expired_records_before_rc;
create function public.purge_expired_records(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb; v_count int;
begin
  v_result := public.purge_expired_records_before_rc(p_dry_run);
  if (v_result->>'locked')::boolean then return v_result; end if;
  select count(*) into v_count from public.daily_rc_sets where created_at <= now()-interval '1 year';
  if not p_dry_run then delete from public.daily_rc_sets where created_at <= now()-interval '1 year'; end if;
  return jsonb_set(v_result,'{counts,daily_rc_sets}',to_jsonb(v_count));
end;
$$;
revoke all on function public.purge_expired_records(boolean) from public, anon, authenticated;
grant execute on function public.purge_expired_records(boolean) to service_role;
