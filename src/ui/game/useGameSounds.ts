import { useEffect, useRef } from 'react'
import type { GameState } from '../../engine'
import { useSound } from '../sound/useSound'
import type { SoundName } from '../sound/sfx'

/** The sound for a change in the game, if any. */
function soundFor(previous: GameState, next: GameState): SoundName | null {
  const from = previous.step.type
  const to = next.step.type
  if (next.results.length > previous.results.length) {
    const result = next.results.at(-1)!
    return result.type === 'estimate' || result.correct ? 'correct' : 'wrong'
  }
  if (from === to) return null
  switch (to) {
    case 'roundIntro':
      return next.step.type === 'roundIntro' && next.rounds[next.step.round]!.doubled
        ? 'doubleTrouble'
        : 'announce'
    case 'fastestFingerIntro':
    case 'tiebreakIntro':
      return 'announce'
    case 'question':
    case 'fastestFingerQuestion':
    case 'tiebreakQuestion':
      return from.endsWith('Intro') ? 'start' : null
    case 'fastestFingerBuzzed':
      return 'buzz'
    case 'answer':
    case 'fastestFingerAnswer':
    case 'tiebreakAnswer':
      return from === 'question' ||
        from === 'fastestFingerQuestion' ||
        from === 'fastestFingerBuzzed' ||
        from === 'tiebreakQuestion'
        ? 'reveal'
        : null
    case 'finished':
      return 'victory'
    default:
      return null
  }
}

/** Plays 8-bit effects as the game moves on (announcements, reveal, right/wrong, victory). */
export function useGameSounds(game: GameState | null) {
  const play = useSound()
  const previous = useRef(game)
  useEffect(() => {
    const before = previous.current
    previous.current = game
    if (!before || !game || before === game) return
    const sound = soundFor(before, game)
    if (sound) play(sound)
  }, [game, play])
}
