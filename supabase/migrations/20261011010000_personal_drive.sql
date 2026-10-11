-- 각 사용자의 Drive 연결 자격증명은 서버만 읽는다.
alter table public.drive_connections alter column encrypted_refresh_token drop not null;
alter table public.drive_connections add column google_subject text;
alter table public.drive_connections add column connected_email text;
alter table public.drive_connections add column revoked_at timestamptz;
revoke all on public.drive_connections from public, anon, authenticated;
grant select, insert, update, delete on public.drive_connections to service_role;

alter table public.study_evidences add column drive_owner_id uuid references public.profiles(id);
drop policy "evidences: own insert" on public.study_evidences;
create policy "evidences: own insert" on public.study_evidences for insert with check (
  exists(select 1 from public.study_logs l where l.id = study_log_id and l.user_id = auth.uid())
  and ((drive_file_id is null and drive_owner_id is null) or (drive_file_id is not null and drive_owner_id = auth.uid()))
);

create or replace function public.record_study_evidence(p_party uuid, p_category public.study_category, p_file_id text, p_mime_type text, p_storage_path text default null)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare v_log uuid;
begin
  if auth.uid() is null or not public.is_party_member(p_party) then raise exception 'forbidden'; end if;
  insert into public.study_logs(party_id, user_id, category, study_date, amount)
    values(p_party, auth.uid(), p_category, (now() at time zone 'Asia/Seoul')::date, 1) returning id into v_log;
  if p_storage_path is not null and
    split_part(p_storage_path, '/', 1) || '/' || split_part(p_storage_path, '/', 2) <> p_party::text || '/' || auth.uid()::text then
    raise exception 'forbidden';
  end if;
  insert into public.study_evidences(study_log_id, drive_file_id, mime_type, storage_path, drive_owner_id)
    values(v_log, p_file_id, p_mime_type, p_storage_path, case when p_file_id is not null then auth.uid() else null end);
  return v_log;
end;
$$;
