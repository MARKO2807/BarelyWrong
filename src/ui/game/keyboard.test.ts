import { describe, expect, it } from 'vitest'
import { gameReducer, type GameState } from '../../engine'
import { NOW, findGame, newGame, playUntil, run } from '../../engine/testing/fixtures'
import { commandForKey } from './keyboard'

/** Applies the key the way the game screen does; unknown keys change nothing. */
function press(game: GameState, ...keys: string[]): GameState {
  return keys.reduce((current, key) => {
    const command = commandForKey(current, key, NOW)
    return command?.type === 'action' ? gameReducer(current, command.action) : current
  }, game)
}

describe('commandForKey', () => {
  const topicFirst = findGame((g) => g.rounds[0]!.kind !== 'estimate')

  it('plays a whole turn with space and T', () => {
    const game = press(topicFirst, ' ', ' ', ' ', 't')
    expect(game.step.type).toBe('judged')
    expect(game.results.at(-1)).toEqual(expect.objectContaining({ correct: true }))
    expect(press(game, ' ').step).toEqual({ type: 'turnIntro', round: 0, turn: 1 })
  })

  it('marks a wrong answer with N and takes it back with Z', () => {
    const judged = press(topicFirst, ' ', ' ', ' ', 'N')
    expect(judged.results.at(-1)).toEqual(expect.objectContaining({ correct: false }))
    expect(press(judged, 'z').step.type).toBe('answer')
  })

  it('pauses and resumes the clock with P', () => {
    const paused = press(topicFirst, ' ', ' ', 'p')
    expect(paused.step.type === 'question' && paused.step.timer.runningSince).toBeNull()
    const resumed = press(paused, 'p')
    expect(resumed.step.type === 'question' && resumed.step.timer.runningSince).toBe(NOW)
  })

  it('picks teams with 1–4', () => {
    const ff = playUntil(newGame({ teams: 3 }), 'fastestFingerQuestion')
    expect(press(ff, '2').step).toEqual(
      expect.objectContaining({ type: 'fastestFingerBuzzed', teamId: 't2' }),
    )
    expect(press(ff, '4')).toBe(ff)

    const estimate = findGame((g) => g.rounds[0]!.kind === 'estimate')
    const answer = run(estimate, { type: 'next' }, { type: 'start', now: NOW }, { type: 'reveal' })
    const estimator = estimate.teams.findIndex((t) => t.id === estimate.rounds[0]!.turns[0]!.teamId)
    expect(press(answer, String(estimator + 1)).step.type).toBe('judged')
  })

  it('opens the menu with Esc and goes full screen with F', () => {
    expect(commandForKey(topicFirst, 'Escape', NOW)).toEqual({ type: 'menu' })
    expect(commandForKey(topicFirst, 'f', NOW)).toEqual({ type: 'fullscreen' })
  })

  it('ignores other keys', () => {
    expect(commandForKey(topicFirst, 'x', NOW)).toBeNull()
    expect(commandForKey(topicFirst, 'p', NOW)).toBeNull()
  })
})
