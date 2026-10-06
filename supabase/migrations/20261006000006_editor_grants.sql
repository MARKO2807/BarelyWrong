-- Explicit table rights for the editor. Newer Supabase projects no longer grant the API roles
-- (anon, authenticated) read and write rights on new tables by default, so the policies from
-- _access.sql and _editor.sql had nothing to allow. RLS still limits all of this to the account
-- with the editor role (public.is_editor()).

grant select, insert, update on public.topics, public.questions, public.question_texts
  to authenticated;
grant select on public.answer_events to authenticated;
grant select, insert, update, delete on public.question_reports to authenticated;
grant select on public.editor_questions to authenticated;

-- Rights nobody uses through the API; TRUNCATE in particular would skip RLS.
revoke truncate, references, trigger on public.topics, public.questions, public.question_texts,
  public.answer_events, public.question_reports from anon, authenticated;
revoke truncate, references, trigger on public.editor_questions, public.game_questions
  from anon, authenticated;
