-- Activity (docs/SPEC.md 9.4): the window size and the browser language of visits and games, to
-- see whether a TV passes as a laptop and how many players would want English (ROADMAP step 2).
-- Older rows keep nulls.

alter table public.visits
  add column window_width smallint check (window_width between 1 and 20000),
  add column window_height smallint check (window_height between 1 and 20000),
  add column language text check (char_length(language) between 1 and 35);

alter table public.game_starts
  add column window_width smallint check (window_width between 1 and 20000),
  add column window_height smallint check (window_height between 1 and 20000),
  add column language text check (char_length(language) between 1 and 35);

grant insert (window_width, window_height, language) on public.visits, public.game_starts to anon;

-- The view gains the new columns at the end (create or replace keeps the existing ones).
create or replace view public.editor_games with (security_invoker = true) as
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
  ) as events,
  s.window_width,
  s.window_height,
  s.language
from public.game_starts s
left join public.game_progress p on p.game_id = s.id
group by s.id;

-- Visits per day also by language (the language only, e.g. 'hr' from 'hr-HR').
drop function public.activity_visits(timestamptz);

create function public.activity_visits(p_since timestamptz)
returns table (day date, screen text, referrer text, language text, visits bigint)
language sql
stable
set search_path = ''
as $$
  select
    (v.created_at at time zone 'Europe/Zagreb')::date,
    v.screen,
    v.referrer,
    lower(split_part(v.language, '-', 1)),
    count(*)
  from public.visits v
  where p_since is null or v.created_at >= p_since
  group by 1, 2, 3, 4
$$;

revoke execute on function public.activity_visits(timestamptz) from public, anon;
grant execute on function public.activity_visits(timestamptz) to authenticated;
