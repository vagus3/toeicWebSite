-- 질문 창구의 AI 답변 확인. 파티원이 AI 답변을 읽고 맞다고 본 표시다 (AI 답변은 틀릴 수 있다).
-- turn_id가 null이면 질문을 올릴 때 만든 첫 AI 답변(questions.ai_answer)이고, 아니면 이어진 AI 대화의 답변이다.
-- 대리 키(id)를 쓴다. 외래 키 두 개를 기본 키로 묶으면 PostgREST가 이 표를 questions와 question_ai_turns를 잇는 표로 보고
-- 기존 question_ai_turns 조인이 모호해질 수 있다.
create table public.question_ai_confirmations (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  turn_id uuid references public.question_ai_turns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique nulls not distinct (question_id, turn_id, user_id)
);
create index question_ai_confirmations_question_idx on public.question_ai_confirmations(question_id);
alter table public.question_ai_confirmations enable row level security;
revoke all on public.question_ai_confirmations from public, anon, authenticated;
grant select, insert, delete on public.question_ai_confirmations to authenticated;

create policy "question ai confirmations: party read" on public.question_ai_confirmations
  for select to authenticated using (
    exists (select 1 from public.questions q where q.id = question_id and public.is_party_member(q.party_id))
  );
-- 본인 이름으로, 실제로 있는 AI 답변에만 남긴다
create policy "question ai confirmations: own add" on public.question_ai_confirmations
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.questions q
      where q.id = question_id and public.is_party_member(q.party_id)
        and case
          when turn_id is null then q.ai_answer is not null
          else exists (select 1 from public.question_ai_turns t where t.id = turn_id and t.question_id = q.id)
        end
    )
  );
create policy "question ai confirmations: own remove" on public.question_ai_confirmations
  for delete to authenticated using (user_id = auth.uid());
-- 부모 질문·AI 대화가 1년 보관 기준으로 삭제되면 확인도 함께 삭제된다.
