-- 오답노트. 오답 목록은 원본(일일 RC·단어 퀴즈·해커스 채점표)에서 매번 계산하고,
-- 여기에는 해커스 결과지에서 추출한 문제·해설과 복습 상태만 본인 전용으로 저장한다.
create table public.review_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  party_id uuid not null references public.parties(id) on delete cascade,
  source text not null check (source in ('daily_rc','word','hackers_rc','hackers_lc')),
  -- daily_rc: 문제 세트 id, word: 퀴즈 응시 id, hackers_*: 채점표 id
  source_ref uuid not null,
  item_number int not null check (item_number between 1 and 200),
  content jsonb check (content is null or jsonb_typeof(content) = 'object'),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, source, source_ref, item_number)
);
create index review_notes_party_idx on public.review_notes(user_id, party_id);
alter table public.review_notes enable row level security;
revoke all on public.review_notes from public, anon, authenticated;
-- 복습 상태는 본인이 직접 기록한다. 추출한 문제(content)는 서버만 쓴다.
grant select, delete on public.review_notes to authenticated;
grant insert (user_id, party_id, source, source_ref, item_number, reviewed_at, updated_at) on public.review_notes to authenticated;
grant update (user_id, party_id, source, source_ref, item_number, reviewed_at, updated_at) on public.review_notes to authenticated;
grant all on public.review_notes to service_role;
create policy "review: own read" on public.review_notes for select to authenticated using (user_id = auth.uid());
create policy "review: own insert" on public.review_notes for insert to authenticated
  with check (user_id = auth.uid() and public.is_party_member(party_id));
create policy "review: own update" on public.review_notes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_party_member(party_id));
create policy "review: own delete" on public.review_notes for delete to authenticated using (user_id = auth.uid());

-- 기존 1년 기록 정리 작업에 연결한다.
alter function public.purge_expired_records(boolean) rename to purge_expired_records_before_review;
create function public.purge_expired_records(p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb; v_count int;
begin
  v_result := public.purge_expired_records_before_review(p_dry_run);
  if (v_result->>'locked')::boolean then return v_result; end if;
  select count(*) into v_count from public.review_notes where created_at <= now()-interval '1 year';
  if not p_dry_run then delete from public.review_notes where created_at <= now()-interval '1 year'; end if;
  return jsonb_set(v_result,'{counts,review_notes}',to_jsonb(v_count));
end;
$$;
revoke all on function public.purge_expired_records(boolean) from public, anon, authenticated;
grant execute on function public.purge_expired_records(boolean) to service_role;
revoke all on function public.purge_expired_records_before_review(boolean) from public, anon, authenticated;
grant execute on function public.purge_expired_records_before_review(boolean) to service_role;
