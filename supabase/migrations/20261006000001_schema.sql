-- Barely Wrong: questions, their texts, statistics and reports (docs/SPEC.md, chapter 7).

create extension if not exists vector with schema extensions;

create table public.topics (
  id text primary key,
  name_hr text not null,
  sort smallint not null unique
);

create table public.questions (
  id text primary key check (id ~ '^[a-z_]+-[0-9]{4,}$'),
  topic_id text not null references public.topics (id),
  format text not null check (format in ('open', 'true_false', 'estimate')),
  difficulty smallint not null check (difficulty between 1 and 3),
  status text not null default 'review'
    check (status in ('review', 'approved', 'rejected', 'archived')),
  origin text not null default 'own',
  source text,
  tags text[] not null default '{}',
  time_sensitive boolean not null default false,
  checked_at date,
  media jsonb,
  editor_note text,
  embedding extensions.vector(384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_topic_format_status on public.questions (topic_id, format, status);

create table public.question_texts (
  question_id text not null references public.questions (id) on delete cascade,
  lang text not null default 'hr',
  question text not null check (length(trim(question)) > 0),
  answer text not null check (length(trim(answer)) > 0),
  accept text[] not null default '{}',
  note text,
  primary key (question_id, lang)
);

create table public.answer_events (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id),
  kind text not null check (kind in ('turn', 'fastest_finger')),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index answer_events_question on public.answer_events (question_id);

create table public.question_reports (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id),
  reason text not null check (reason in ('wrong', 'unclear', 'outdated', 'too_hard', 'other')),
  comment text check (length(comment) <= 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index question_reports_open on public.question_reports (question_id) where not resolved;

-- Keeps questions.updated_at current; question text edits count as edits of the question.
create function public.touch_question() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'questions' then
    new.updated_at = now();
  else
    update public.questions set updated_at = now()
    where id = coalesce(new.question_id, old.question_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger questions_touch before update on public.questions
  for each row execute function public.touch_question();

create trigger question_texts_touch after insert or update or delete on public.question_texts
  for each row execute function public.touch_question();
