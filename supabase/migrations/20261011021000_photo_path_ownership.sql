-- 직접 DB 삽입이나 과거 잘못된 메타데이터로 다른 사용자의 파일에 접근/삭제하지 못한다.
drop policy "evidences: own insert" on public.study_evidences;
create policy "evidences: own insert" on public.study_evidences for insert with check (
  exists (
    select 1 from public.study_logs l
    where l.id = study_log_id and l.user_id = auth.uid()
      and ((drive_file_id is null and drive_owner_id is null
            and (storage_path is null or
              (split_part(storage_path, '/', 1) = l.party_id::text
               and split_part(storage_path, '/', 2) = l.user_id::text)))
        or (drive_file_id is not null and drive_owner_id = auth.uid()))
  )
);

drop policy "study photos: party read" on storage.objects;
create policy "study photos: party read" on storage.objects for select to authenticated using (
  bucket_id = 'study-evidence' and exists (
    select 1 from public.study_evidences e join public.study_logs l on l.id = e.study_log_id
    where e.storage_path = storage.objects.name
      and split_part(storage.objects.name, '/', 1) = l.party_id::text
      and split_part(storage.objects.name, '/', 2) = l.user_id::text
      and public.is_party_member(l.party_id)
  )
);

create or replace function public.purge_expired_records(p_dry_run boolean default true)
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
          select e.storage_path from public.study_evidences e
          join public.study_logs l on l.id = e.study_log_id
          where e.storage_path is not null
            and split_part(e.storage_path, '/', 1) = l.party_id::text
            and split_part(e.storage_path, '/', 2) = l.user_id::text
            and (e.uploaded_at <= v_cutoff or l.created_at <= v_cutoff)
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
