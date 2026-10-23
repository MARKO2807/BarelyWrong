-- Activity (docs/SPEC.md 9.4): progress after every question, not only after every round, so the
-- editor's live view shows where a game is ("runda 3/12, pitanje 2/4"). Older rows get turn 0.

alter table public.game_progress
  add column turn smallint not null default 0 check (turn between 0 and 8);

-- 'turn': the question number `turn` (from 1) of round `round` was judged and the game moved on.
alter table public.game_progress drop constraint game_progress_event_check;
alter table public.game_progress
  add constraint game_progress_event_check
  check (event in ('turn', 'round', 'finished', 'abandoned'));

-- The same question or round reported twice (Undo and play again) is still refused.
alter table public.game_progress drop constraint game_progress_game_id_event_round_key;
alter table public.game_progress
  add constraint game_progress_game_id_event_round_turn_key unique (game_id, event, round, turn);

grant insert (turn) on public.game_progress to anon;

-- Rounds done count only round ends; the events list carries the turns too.
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
  coalesce(max(p.round) filter (where p.event <> 'turn'), 0)::int as rounds_done,
  case
    when bool_or(p.event = 'finished') then 'finished'
    when bool_or(p.event = 'abandoned') then 'abandoned'
    else 'open'
  end as status,
  max(p.created_at) as last_event_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object('event', p.event, 'round', p.round, 'turn', p.turn, 'at', p.created_at)
      order by p.created_at
    ) filter (where p.id is not null),
    '[]'::jsonb
  ) as events,
  s.window_width,
  s.window_height,
  s.language
from public.game_starts s
left join public.game_progress p on p.game_id = s.id
group by s.id;
