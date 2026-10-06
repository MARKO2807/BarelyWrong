-- Who may do what (docs/SPEC.md, chapter 7).
-- Players (anon) read approved questions only through game_questions and may add statistics and
-- reports. The editor (the only account; sign-ups are off) may do everything.

-- The view runs with its owner's rights, so it can read the tables players cannot.
create view public.game_questions as
select
  q.id,
  q.topic_id as topic,
  q.format,
  q.difficulty,
  t.question,
  t.answer,
  t.accept,
  t.note
from public.questions q
join public.question_texts t on t.question_id = q.id and t.lang = 'hr'
where q.status = 'approved';

alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_texts enable row level security;
alter table public.answer_events enable row level security;
alter table public.question_reports enable row level security;

-- Supabase grants anon everything on public tables by default; take it back and grant only
-- what players need, so RLS is a second line rather than the only one.
revoke all on public.topics, public.questions, public.question_texts, public.answer_events,
  public.question_reports from anon;
revoke all on public.game_questions from anon, authenticated;

grant select on public.game_questions to anon, authenticated;
grant insert (question_id, kind, correct) on public.answer_events to anon;
grant insert (question_id, reason, comment) on public.question_reports to anon;

create policy "players add statistics" on public.answer_events
  for insert to anon with check (true);

create policy "players add reports" on public.question_reports
  for insert to anon with check (resolved = false);

create policy "editor manages topics" on public.topics
  for all to authenticated using (true) with check (true);
create policy "editor manages questions" on public.questions
  for all to authenticated using (true) with check (true);
create policy "editor manages question texts" on public.question_texts
  for all to authenticated using (true) with check (true);
create policy "editor reads statistics" on public.answer_events
  for select to authenticated using (true);
create policy "editor manages reports" on public.question_reports
  for all to authenticated using (true) with check (true);
