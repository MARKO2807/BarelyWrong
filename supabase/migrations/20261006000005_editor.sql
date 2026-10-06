-- The editor (docs/SPEC.md 9.3): an explicit editor role, import, statistics and duplicate search.

-- Editor role ------------------------------------------------------------------------------------
-- Only an account marked in app_metadata (which users cannot change themselves) is the editor, so
-- an account created by mistake (if sign-ups were ever switched on) gets nothing. Set it once with:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"editor"}'
--   where email = '<editor e-mail>';
create or replace function public.is_editor() returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor', false)
$$;

drop policy if exists "editor manages topics" on public.topics;
drop policy if exists "editor manages questions" on public.questions;
drop policy if exists "editor manages question texts" on public.question_texts;
drop policy if exists "editor reads statistics" on public.answer_events;
drop policy if exists "editor manages reports" on public.question_reports;

create policy "editor manages topics" on public.topics
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor manages questions" on public.questions
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor manages question texts" on public.question_texts
  for all to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "editor reads statistics" on public.answer_events
  for select to authenticated using (public.is_editor());
create policy "editor manages reports" on public.question_reports
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Questions are never deleted (they get a status), so an id can never come back.
revoke delete on public.questions from authenticated;

-- Embeddings -------------------------------------------------------------------------------------
-- Editing the question or the answer makes the stored embedding stale: drop it so `npm run embed`
-- recomputes it. Computing an embedding is not an edit, so it leaves updated_at alone.
create or replace function public.touch_question() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'questions' then
    new.updated_at = now();
  else
    update public.questions
    set updated_at = now(),
      embedding = case
        when tg_op = 'UPDATE' and (new.question, new.answer) is distinct from (old.question, old.answer)
          then null
        else embedding
      end
    where id = coalesce(new.question_id, old.question_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists questions_touch on public.questions;
create trigger questions_touch before update on public.questions
  for each row
  when (old.embedding::text is not distinct from new.embedding::text)
  execute function public.touch_question();

create index if not exists questions_embedding on public.questions
  using hnsw (embedding extensions.vector_cosine_ops);

-- Editor view ------------------------------------------------------------------------------------
-- Everything the editor lists and edits, plus statistics. Runs with the caller's rights, so only
-- the editor sees rows.
create or replace view public.editor_questions with (security_invoker = true) as
select
  q.id,
  q.topic_id as topic,
  q.format,
  q.difficulty,
  q.status,
  q.origin,
  q.source,
  q.tags,
  q.time_sensitive,
  q.checked_at,
  q.editor_note,
  q.embedding is not null as has_embedding,
  q.created_at,
  q.updated_at,
  t.question,
  t.answer,
  t.accept,
  t.note,
  coalesce(s.shown, 0)::int as shown,
  coalesce(s.correct, 0)::int as correct,
  coalesce(r.open_reports, 0)::int as open_reports
from public.questions q
join public.question_texts t on t.question_id = q.id and t.lang = 'hr'
left join (
  select question_id, count(*) as shown, count(*) filter (where correct) as correct
  from public.answer_events
  group by question_id
) s on s.question_id = q.id
left join (
  select question_id, count(*) as open_reports
  from public.question_reports
  where not resolved
  group by question_id
) r on r.question_id = q.id;

revoke all on public.editor_questions from anon;

-- Import -----------------------------------------------------------------------------------------
-- Inserts a checked batch (src/data/import) in one transaction: all of it or nothing. A question
-- without an id gets the next free number in its topic (`sport-0042`).
create or replace function public.import_questions(items jsonb)
returns table (item_index int, id text)
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  item jsonb;
  item_position int := 0;
  new_id text;
  next_number int;
begin
  if not public.is_editor() then
    raise exception 'Only the editor can import questions' using errcode = '42501';
  end if;
  -- One import at a time, so two imports cannot hand out the same number.
  perform pg_advisory_xact_lock(hashtext('public.import_questions'));

  for item in select value from jsonb_array_elements(items)
  loop
    new_id := item ->> 'id';
    if new_id is null then
      select coalesce(max(substring(q.id from '-([0-9]+)$')::int), 0) + 1
      into next_number
      from public.questions q
      where q.topic_id = item ->> 'topic';
      new_id := (item ->> 'topic') || '-' || lpad(next_number::text, 4, '0');
    end if;

    insert into public.questions
      (id, topic_id, format, difficulty, status, origin, source, tags, time_sensitive, checked_at,
       editor_note, embedding)
    values (
      new_id,
      item ->> 'topic',
      item ->> 'format',
      (item ->> 'difficulty')::smallint,
      item ->> 'status',
      item ->> 'origin',
      item ->> 'source',
      array(select jsonb_array_elements_text(coalesce(item -> 'tags', '[]'))),
      coalesce((item ->> 'time_sensitive')::boolean, false),
      (item ->> 'checked_at')::date,
      item ->> 'editor_note',
      (item ->> 'embedding')::extensions.vector
    );

    insert into public.question_texts (question_id, question, answer, accept, note)
    values (
      new_id,
      item ->> 'question',
      item ->> 'answer',
      array(select jsonb_array_elements_text(coalesce(item -> 'accept', '[]'))),
      item ->> 'note'
    );

    item_index := item_position;
    id := new_id;
    return next;
    item_position := item_position + 1;
  end loop;
end;
$$;

-- Duplicate search -------------------------------------------------------------------------------
-- Cosine similarity of question embeddings (1 = same meaning). Thresholds live in the app
-- (spec 8.5: from 0.92 a likely duplicate, 0.85–0.92 worth a look).

/** The closest questions to an embedding that is not stored yet (used by the import). */
create or replace function public.match_questions(
  query_embedding extensions.vector(384),
  min_similarity float,
  max_results int default 5
)
returns table (id text, topic text, status text, question text, answer text, similarity float)
language sql
stable
set search_path = ''
as $$
  select q.id, q.topic_id, q.status, t.question, t.answer,
    1 - (q.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.questions q
  join public.question_texts t on t.question_id = q.id and t.lang = 'hr'
  where q.embedding is not null
    and 1 - (q.embedding operator(extensions.<=>) query_embedding) >= min_similarity
  order by q.embedding operator(extensions.<=>) query_embedding
  limit max_results
$$;

/** Every pair of stored questions at least this similar, each pair once. */
create or replace function public.similar_pairs(min_similarity float)
returns table (id text, other_id text, similarity float)
language sql
stable
set search_path = ''
as $$
  select distinct least(a.id, b.id), greatest(a.id, b.id),
    1 - (a.embedding operator(extensions.<=>) b.embedding)
  from public.questions a
  cross join lateral (
    select q.id, q.embedding
    from public.questions q
    where q.embedding is not null and q.id <> a.id
    order by q.embedding operator(extensions.<=>) a.embedding
    limit 5
  ) b
  where a.embedding is not null
    and 1 - (a.embedding operator(extensions.<=>) b.embedding) >= min_similarity
$$;

-- Functions are executable by everyone by default; these are for the editor only.
revoke execute on function public.import_questions(jsonb) from public, anon;
revoke execute on function public.match_questions(extensions.vector, float, int) from public, anon;
revoke execute on function public.similar_pairs(float) from public, anon;
grant execute on function public.import_questions(jsonb) to authenticated;
grant execute on function public.match_questions(extensions.vector, float, int) to authenticated;
grant execute on function public.similar_pairs(float) to authenticated;
