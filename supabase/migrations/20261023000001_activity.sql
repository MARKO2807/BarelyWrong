-- Activity for the editor (docs/SPEC.md 9.4, ROADMAP step 5): visits and games, without cookies,
-- IP addresses, team names or a lasting device id. Players may only add rows; the editor reads
-- them and may delete games (with their progress). Nobody can change a row.

create table public.visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) between 1 and 200),
  screen text not null check (screen in ('phone', 'tablet', 'laptop', 'large')),
  -- Only the host of document.referrer (e.g. 'www.google.com'); null when typed in or unknown.
  referrer text check (char_length(referrer) between 1 and 200),
  time_zone text check (char_length(time_zone) between 1 and 64)
);

create table public.game_starts (
  -- Made by the browser (crypto.randomUUID), so progress can be sent before the start returns.
  id uuid primary key,
  created_at timestamptz not null default now(),
  team_count smallint not null check (team_count between 2 and 4),
  length text not null check (length in ('full', 'short')),
  seconds_per_question smallint not null check (seconds_per_question in (30, 45, 60, 75, 90)),
  fastest_finger boolean not null,
  -- Round kinds in playing order: topics, 'true_false', 'estimate'.
  rounds text[] not null check (cardinality(rounds) between 1 and 12),
  rematch boolean not null,
  screen text not null check (screen in ('phone', 'tablet', 'laptop', 'large')),
  time_zone text check (char_length(time_zone) between 1 and 64),
  theme text not null check (theme in ('dark', 'light')),
  sound boolean not null
);

create table public.game_progress (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.game_starts(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 'round': a round ended (round = its number from 1); 'finished': the game ended; 'abandoned':
  -- Prekini partiju (round = rounds completed until then).
  event text not null check (event in ('round', 'finished', 'abandoned')),
  round smallint not null check (round between 0 and 12),
  -- Undo and play again sends the same event twice; the second one is refused.
  unique (game_id, event, round)
);

create index game_starts_created on public.game_starts (created_at desc);
create index visits_created on public.visits (created_at desc);

alter table public.visits enable row level security;
alter table public.game_starts enable row level security;
alter table public.game_progress enable row level security;

revoke all on public.visits, public.game_starts, public.game_progress from anon, authenticated;

-- Players: add rows, named columns only (id and created_at are the database's).
grant insert (path, screen, referrer, time_zone) on public.visits to anon;
grant insert (id, team_count, length, seconds_per_question, fastest_finger, rounds, rematch,
  screen, time_zone, theme, sound) on public.game_starts to anon;
grant insert (game_id, event, round) on public.game_progress to anon;

create policy "players add visits" on public.visits for insert to anon with check (true);
create policy "players add games" on public.game_starts for insert to anon with check (true);
create policy "players add game progress" on public.game_progress
  for insert to anon with check (true);

-- The editor: read everything, delete games (fake or test ones). Visits are never deleted.
grant select on public.visits to authenticated;
grant select, delete on public.game_starts, public.game_progress to authenticated;

create policy "editor reads visits" on public.visits
  for select to authenticated using (public.is_editor());
create policy "editor reads games" on public.game_starts
  for select to authenticated using (public.is_editor());
create policy "editor deletes games" on public.game_starts
  for delete to authenticated using (public.is_editor());
create policy "editor reads game progress" on public.game_progress
  for select to authenticated using (public.is_editor());
create policy "editor deletes game progress" on public.game_progress
  for delete to authenticated using (public.is_editor());

-- One row per game for the editor. Runs with the caller's rights, so only the editor sees rows.
create view public.editor_games with (security_invoker = true) as
select
  s.id,
  s.created_at,
  s.team_count,
  s.length,
  s.seconds_per_question,
  s.fastest_finger,
  s.rounds,
  s.rematch,
  s.screen,
  s.time_zone,
  s.theme,
  s.sound,
  coalesce(max(p.round), 0)::int as rounds_done,
  case
    when bool_or(p.event = 'finished') then 'finished'
    when bool_or(p.event = 'abandoned') then 'abandoned'
    else 'open'
  end as status,
  max(p.created_at) as last_event_at,
  coalesce(
    jsonb_agg(jsonb_build_object('event', p.event, 'round', p.round, 'at', p.created_at)
      order by p.created_at) filter (where p.id is not null),
    '[]'::jsonb
  ) as events
from public.game_starts s
left join public.game_progress p on p.game_id = s.id
group by s.id;

revoke all on public.editor_games from anon, authenticated;
grant select on public.editor_games to authenticated;

-- Visits per day (Croatian time), screen and referrer since a moment (null: all of them).
create function public.activity_visits(p_since timestamptz)
returns table (day date, screen text, referrer text, visits bigint)
language sql
stable
set search_path = ''
as $$
  select (v.created_at at time zone 'Europe/Zagreb')::date, v.screen, v.referrer, count(*)
  from public.visits v
  where p_since is null or v.created_at >= p_since
  group by 1, 2, 3
$$;

revoke execute on function public.activity_visits(timestamptz) from public, anon;
grant execute on function public.activity_visits(timestamptz) to authenticated;
