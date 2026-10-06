import { getTimer, isTimerRunning, type GameAction, type GameState } from '../../engine'

/** What a key press means in the current step (spec 5: keyboard shortcuts). */
export type KeyCommand =
  { type: 'action'; action: GameAction } | { type: 'fullscreen' } | { type: 'menu' }

/** Space: Kreni / Otvori odgovor / Dalje, whichever the step offers. */
function spaceAction(game: GameState, now: number): GameAction | null {
  switch (game.step.type) {
    case 'roundIntro':
    case 'judged':
    case 'leaderboard':
    case 'fastestFingerJudged':
      return { type: 'next' }
    case 'fastestFingerAnswer':
      return game.step.teamId === null ? { type: 'next' } : null
    case 'turnIntro':
    case 'fastestFingerIntro':
    case 'tiebreakIntro':
      return { type: 'start', now }
    case 'question':
    case 'fastestFingerQuestion':
    case 'fastestFingerBuzzed':
    case 'tiebreakQuestion':
      return { type: 'reveal' }
    default:
      return null
  }
}

/** Keys 1–4 pick a team by its place in the team list. */
function teamAction(game: GameState, index: number, now: number): GameAction | null {
  const team = game.teams[index]
  if (!team) return null
  switch (game.step.type) {
    case 'answer':
    case 'tiebreakAnswer':
      return { type: 'award', teamId: team.id }
    case 'fastestFingerQuestion':
      return { type: 'buzz', teamId: team.id, now }
    default:
      return null
  }
}

export function commandForKey(game: GameState, key: string, now: number): KeyCommand | null {
  const action = (a: GameAction | null): KeyCommand | null =>
    a ? { type: 'action', action: a } : null
  switch (key.toLowerCase()) {
    case ' ':
      return action(spaceAction(game, now))
    case 't':
      return action({ type: 'judge', correct: true })
    case 'n':
      return action({ type: 'judge', correct: false })
    case 'z':
      return action({ type: 'undo', now })
    case 'p': {
      const timer = getTimer(game)
      if (!timer) return null
      return action({ type: isTimerRunning(timer) ? 'pause' : 'resume', now })
    }
    case 'f':
      return { type: 'fullscreen' }
    case 'escape':
      return { type: 'menu' }
    case '1':
    case '2':
    case '3':
    case '4':
      return action(teamAction(game, Number(key) - 1, now))
    default:
      return null
  }
}
