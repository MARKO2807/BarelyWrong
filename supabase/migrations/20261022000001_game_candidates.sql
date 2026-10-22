-- The server picks the questions a new game can use (docs/ROADMAP.md, step 1). Instead of reading
-- every approved question, a game asks for a few random unplayed ones of every round kind and
-- difficulty; the engine then plans the game from them exactly as before (src/engine/select.ts,
-- pickCandidates does the same for the local source).

-- Up to p_per_difficulty random approved questions in language p_lang for every round kind
-- (the topic of open questions, otherwise the format) and difficulty, leaving out p_exclude.
-- Runs with its owner's rights, like the game_questions view, so players never read the tables.
create or replace function public.game_candidates(
  p_lang text,
  p_per_difficulty int,
  p_exclude text[]
)
returns table (
  id text,
  topic text,
  format text,
  difficulty smallint,
  question text,
  answer text,
  accept text[],
  note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.topic, c.format, c.difficulty, c.question, c.answer, c.accept, c.note
  from (
    select
      q.id,
      q.topic_id as topic,
      q.format,
      q.difficulty,
      t.question,
      t.answer,
      t.accept,
      t.note,
      row_number() over (
        partition by case when q.format = 'open' then q.topic_id else q.format end, q.difficulty
        order by random()
      ) as rank
    from public.questions q
    join public.question_texts t on t.question_id = q.id and t.lang = p_lang
    where q.status = 'approved'
      and not (q.id = any (coalesce(p_exclude, '{}')))
  ) c
  where c.rank <= least(greatest(p_per_difficulty, 1), 50)
$$;

-- Topic and format of the given approved questions. When a round kind runs out, the app uses
-- this to bring back the played questions of that kind (the ShortageDialog).
create or replace function public.question_kinds(p_ids text[])
returns table (id text, topic text, format text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.topic_id, q.format
  from public.questions q
  where q.status = 'approved' and q.id = any (coalesce(p_ids, '{}'))
$$;

revoke execute on function public.game_candidates(text, int, text[]) from public;
revoke execute on function public.question_kinds(text[]) from public;
grant execute on function public.game_candidates(text, int, text[]) to anon, authenticated;
grant execute on function public.question_kinds(text[]) to anon, authenticated;
