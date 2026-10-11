-- 앱 기록만 1년 보관한다. 개인/기존 Google Drive 원본에는 손대지 않는다.
create table public.retention_file_cleanup (
  storage_path text primary key,
  queued_at timestamptz not null default now(),
  claim_id uuid,
  claimed_until timestamptz,
  attempts integer not null default 0
);
alter table public.retention_file_cleanup enable row level security;
revoke all on public.retention_file_cleanup from public, anon, authenticated;
grant select, insert, update, delete on public.retention_file_cleanup to service_role;

-- 파일 정리가 지연되어도 만료된 사진의 새 조회/서명 URL 발급을 막는다.
drop policy "study photos: party read" on storage.objects;
create policy "study photos: party read" on storage.objects for select to authenticated using (
  bucket_id = 'study-evidence' and exists (
    select 1 from public.study_evidences e join public.study_logs l on l.id = e.study_log_id
    where e.storage_path = storage.objects.name and public.is_party_member(l.party_id)
  )
);

create function public.purge_expired_records(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public set timezone = 'UTC'
as $$
declare
  v_cutoff timestamptz := now() - interval '1 year';
  v_table text;
  v_condition text;
  v_count bigint;
  v_counts jsonb := '{}'::jsonb;
begin
  if p_dry_run is null then raise exception 'invalid_dry_run'; end if;
  if not pg_try_advisory_xact_lock(70111020000::bigint) then
    return jsonb_build_object('locked', true, 'dry_run', p_dry_run);
  end if;

  -- 부모가 만료된 하위 기록도 포함해 cascade 삭제 건수를 집계한다.
  foreach v_table in array array[
    'study_evidences', 'reactions', 'question_replies', 'quiz_answers',
    'notifications', 'nudges', 'chat_messages', 'quiz_attempts',
    'vocabulary_items', 'questions', 'study_logs'
  ] loop
    v_condition := case v_table
      when 'study_evidences' then 'uploaded_at <= $1 or study_log_id in (select id from public.study_logs where created_at <= $1)'
      when 'reactions' then 'created_at <= $1 or study_log_id in (select id from public.study_logs where created_at <= $1)'
      when 'question_replies' then 'created_at <= $1 or question_id in (select id from public.questions where created_at <= $1)'
      when 'quiz_answers' then 'attempt_id in (select id from public.quiz_attempts where created_at <= $1)'
      when 'vocabulary_items' then 'created_at <= $1 and user_id is not null'
      else 'created_at <= $1'
    end;
    if p_dry_run then
      execute format('select count(*) from public.%I where %s', v_table, v_condition)
        into v_count using v_cutoff;
    else
      if v_table = 'study_evidences' then
        insert into public.retention_file_cleanup(storage_path)
          select storage_path from public.study_evidences
          where storage_path is not null and
            (uploaded_at <= v_cutoff or study_log_id in
              (select id from public.study_logs where created_at <= v_cutoff))
          on conflict(storage_path) do nothing;
      end if;
      execute format('delete from public.%I where %s', v_table, v_condition) using v_cutoff;
      get diagnostics v_count = row_count;
    end if;
    v_counts := v_counts || jsonb_build_object(v_table, v_count);
  end loop;
  return jsonb_build_object('locked', false, 'dry_run', p_dry_run, 'counts', v_counts);
end;
$$;
revoke all on function public.purge_expired_records(boolean) from public, anon, authenticated;
grant execute on function public.purge_expired_records(boolean) to service_role;

-- 여러 Cron 실행이 같은 파일을 동시에 처리하지 않는다. 중단 후 5분이 지나면 재시도한다.
create function public.claim_retention_files()
returns table(storage_path text, claim_id uuid)
language sql security definer set search_path = public as $$
  with candidates as (
    select q.storage_path from public.retention_file_cleanup q
    where q.claimed_until is null or q.claimed_until <= now()
    order by q.attempts, q.queued_at limit 50 for update skip locked
  )
  update public.retention_file_cleanup q
    set claim_id = gen_random_uuid(), claimed_until = now() + interval '5 minutes',
        attempts = attempts + 1
    from candidates c where q.storage_path = c.storage_path
    returning q.storage_path, q.claim_id;
$$;
revoke all on function public.claim_retention_files() from public, anon, authenticated;
grant execute on function public.claim_retention_files() to service_role;

do $$
declare v_table text;
begin
  foreach v_table in array array['study_logs', 'reactions', 'question_replies',
    'notifications', 'nudges', 'chat_messages', 'quiz_attempts', 'vocabulary_items', 'questions'] loop
    execute format('create index if not exists %I on public.%I(created_at)', v_table || '_retention_idx', v_table);
  end loop;
end;
$$;
create index study_evidences_retention_idx on public.study_evidences(uploaded_at);
