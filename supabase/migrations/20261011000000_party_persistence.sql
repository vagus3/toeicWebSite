-- 초대 검증과 파티/채팅방 등록은 한 트랜잭션에서 처리한다.
-- OAuth 공급자의 이름은 서비스 닉네임 제한보다 길거나 비어 있을 수 있다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, nickname, avatar_url, track)
  values(new.id, left(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''), '파티원'), 20),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.raw_user_meta_data ->> 'track' in ('700', '800', '900+')
      then new.raw_user_meta_data ->> 'track' else null end);
  insert into public.notification_preferences(user_id) values(new.id);
  return new;
end;
$$;

alter table public.parties add column invite_code text unique;
alter table public.quiz_attempts add column answers jsonb;
alter table public.study_evidences alter column drive_file_id drop not null;
alter table public.study_evidences add column storage_path text;
alter table public.study_evidences add constraint evidence_storage_source check (
  (drive_file_id is not null) <> (storage_path is not null)
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('study-evidence', 'study-evidence', false, 4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict(id) do nothing;
create policy "study photos: member upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'study-evidence' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_party_member(((storage.foldername(name))[1])::uuid)
);
create policy "study photos: party read" on storage.objects for select to authenticated using (
  bucket_id = 'study-evidence' and public.is_party_member(((storage.foldername(name))[1])::uuid)
);
create policy "study photos: own cleanup" on storage.objects for delete to authenticated using (
  bucket_id = 'study-evidence' and (storage.foldername(name))[2] = auth.uid()::text
);

create function public.create_study_party(p_name text, p_exam_date date, p_capacity int default 6)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_party uuid;
  v_room uuid;
  v_code text := encode(gen_random_bytes(24), 'hex');
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if char_length(trim(p_name)) not between 1 and 40 or p_capacity not between 2 and 20 then
    raise exception 'invalid_request';
  end if;
  insert into public.parties(name, owner_id, capacity, exam_date, invite_code, invite_code_hash)
  values(trim(p_name), v_user, p_capacity, p_exam_date, v_code, encode(digest(v_code, 'sha256'), 'hex'))
  returning id into v_party;
  insert into public.party_members(party_id, user_id, role) values(v_party, v_user, 'owner');
  insert into public.chat_rooms(party_id) values(v_party) returning id into v_room;
  insert into public.chat_room_members(room_id, user_id) values(v_room, v_user);
  return v_party;
end;
$$;

create function public.preview_party_invite(p_code text)
returns table(party_name text, inviter_name text, capacity int, member_count bigint)
language sql stable security definer set search_path = public, extensions
as $$
  select p.name, u.nickname, p.capacity,
    (select count(*) from public.party_members m where m.party_id = p.id)
  from public.parties p join public.profiles u on u.id = p.owner_id
  where p.invite_code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

create function public.join_study_party(p_code text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_party public.parties%rowtype;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  -- 동일 파티의 참가 요청을 직렬화하여 마지막 한 자리를 중복 배정하지 않는다.
  select * into v_party from public.parties
  where invite_code_hash = encode(digest(p_code, 'sha256'), 'hex') for update;
  if not found then raise exception 'invalid_invite'; end if;
  if not exists(select 1 from public.party_members where party_id = v_party.id and user_id = v_user) then
    if (select count(*) from public.party_members where party_id = v_party.id) >= v_party.capacity then
      raise exception 'party_full';
    end if;
    insert into public.party_members(party_id, user_id) values(v_party.id, v_user);
  end if;
  insert into public.chat_room_members(room_id, user_id)
    select id, v_user from public.chat_rooms where party_id = v_party.id and type = 'party'
    on conflict do nothing;
  return v_party.id;
end;
$$;

-- 기존 파티도 파티원이 요청하면 공유 가능한 초대 코드를 한 번 발급한다.
create function public.study_party_invite(p_party uuid)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_code text;
begin
  if not public.is_party_member(p_party) then raise exception 'forbidden'; end if;
  select invite_code into v_code from public.parties where id = p_party for update;
  if v_code is null then
    v_code := encode(gen_random_bytes(24), 'hex');
    update public.parties set invite_code = v_code,
      invite_code_hash = encode(digest(v_code, 'sha256'), 'hex') where id = p_party;
  end if;
  return v_code;
end;
$$;

-- 학습 로그와 사진 메타데이터가 함께 저장되거나 함께 롤백된다.
create function public.record_study_evidence(p_party uuid, p_category public.study_category, p_file_id text, p_mime_type text, p_storage_path text default null)
returns uuid language plpgsql security invoker set search_path = public
as $$
declare v_log uuid;
begin
  if auth.uid() is null or not public.is_party_member(p_party) then raise exception 'forbidden'; end if;
  insert into public.study_logs(party_id, user_id, category, study_date, amount)
    values(p_party, auth.uid(), p_category, (now() at time zone 'Asia/Seoul')::date, 1)
    returning id into v_log;
  if p_storage_path is not null and
    split_part(p_storage_path, '/', 1) || '/' || split_part(p_storage_path, '/', 2) <> p_party::text || '/' || auth.uid()::text then
    raise exception 'forbidden';
  end if;
  insert into public.study_evidences(study_log_id, drive_file_id, mime_type, storage_path)
    values(v_log, p_file_id, p_mime_type, p_storage_path);
  return v_log;
end;
$$;

create function public.record_daily_quiz(p_party uuid, p_score int, p_answers jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_party_member(p_party) then raise exception 'forbidden'; end if;
  insert into public.quiz_attempts(party_id, user_id, kind, score, answers)
    values(p_party, auth.uid(), 'daily', p_score, p_answers);
  if not exists(select 1 from public.study_logs where party_id = p_party and user_id = auth.uid()
    and category = 'word' and study_date = (now() at time zone 'Asia/Seoul')::date) then
    insert into public.study_logs(party_id, user_id, category, amount) values(p_party, auth.uid(), 'word', 1);
  end if;
end;
$$;

-- 클라이언트가 정원·소유자·초대 코드를 직접 바꾸지 못하게 한다.
revoke update on public.parties from authenticated;
grant update(name, exam_date) on public.parties to authenticated;
drop policy "nudges: send in party" on public.nudges;
create policy "nudges: send in party" on public.nudges for insert with check (
  sender_id = auth.uid() and public.is_party_member(party_id)
  and exists(select 1 from public.party_members where party_id = nudges.party_id and user_id = receiver_id)
);

revoke all on function public.create_study_party(text, date, int) from public;
revoke all on function public.preview_party_invite(text) from public;
revoke all on function public.join_study_party(text) from public;
revoke all on function public.study_party_invite(uuid) from public;
revoke all on function public.record_study_evidence(uuid, public.study_category, text, text, text) from public;
revoke all on function public.record_daily_quiz(uuid, int, jsonb) from public;
grant execute on function public.create_study_party(text, date, int) to authenticated;
grant execute on function public.preview_party_invite(text) to anon, authenticated;
grant execute on function public.join_study_party(text) to authenticated;
grant execute on function public.study_party_invite(uuid) to authenticated;
grant execute on function public.record_study_evidence(uuid, public.study_category, text, text, text) to authenticated;
-- 채점 결과는 서버에서만 전달한다. 아래 RPC는 본인 데이터에만 RLS를 적용한다.
grant execute on function public.record_daily_quiz(uuid, int, jsonb) to authenticated;
