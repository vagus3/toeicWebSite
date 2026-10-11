-- AI 대화는 같은 질문의 파티원에게만 공개하며, 답변 생성 서버만 기록한다.
create table public.question_ai_turns (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 2000),
  answer text not null check (char_length(answer) > 0),
  created_at timestamptz not null default now()
);
create index question_ai_turns_question_created_idx on public.question_ai_turns(question_id, created_at, id);
alter table public.question_ai_turns enable row level security;
revoke all on public.question_ai_turns from public, anon, authenticated;
grant select on public.question_ai_turns to authenticated;
grant select, insert, update, delete on public.question_ai_turns to service_role;
create policy "ai turns: party read" on public.question_ai_turns for select to authenticated using (
  exists(select 1 from public.questions q where q.id = question_id and public.is_party_member(q.party_id))
);
-- 부모 질문이 1년 보관 기준으로 삭제되면 AI 대화도 함께 삭제된다.

-- 과거에 답변 대신 저장된 연결 안내 문구는 AI 답변으로 취급하지 않는다.
update public.questions set ai_answer = null where ai_answer in (
  'AI 초안을 만들지 못했어요. 파티원의 보충 답변을 기다려 주세요.',
  'AI가 연결되지 않았어요. 파티원의 보충 답변을 기다려 주세요.',
  'AI 초안은 서버에 GEMINI_API_KEY를 설정하면 자동으로 만들어져요. 그동안 파티원들의 보충 답변을 기다려 주세요.'
);
