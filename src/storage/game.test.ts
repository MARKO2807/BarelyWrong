// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { gameReducer } from '../engine'
import { TEST_OPTIONS, makeTeams, newGame, playToEnd } from '../engine/testing/fixtures'
import {
  KEYS,
  clearGame,
  getPlayedIds,
  hasUnfinishedGame,
  loadGame,
  loadLastSetup,
  markPlayed,
  resetPlayed,
  saveGame,
  saveLastSetup,
  unmarkPlayed,
} from '.'

beforeEach(() => {
  localStorage.clear()
})

describe('game in progress', () => {
  it('saves and loads with the time it was saved', () => {
    const game = gameReducer(newGame(), { type: 'next' })
    expect(saveGame(game, 1234)).toBe(true)
    expect(loadGame()).toEqual({ savedAt: 1234, game })
    expect(hasUnfinishedGame()).toBe(true)
  })

  it('has nothing to continue when no game or a finished game is saved', () => {
    expect(loadGame()).toBeNull()
    expect(hasUnfinishedGame()).toBe(false)
    saveGame(playToEnd(newGame({ teams: 2 })))
    expect(hasUnfinishedGame()).toBe(false)
  })

  it('throws away a damaged save', () => {
    const game = newGame()
    saveGame({ ...game, step: { type: 'judged', round: 0 } } as unknown as typeof game)
    expect(loadGame()).toBeNull()
    expect(localStorage.getItem(KEYS.game)).toBeNull()

    localStorage.setItem(KEYS.game, '{oops')
    expect(loadGame()).toBeNull()
  })

  it('is cleared when a game is abandoned', () => {
    saveGame(newGame())
    clearGame()
    expect(loadGame()).toBeNull()
  })
})

describe('played questions', () => {
  it('marks, unmarks and resets', () => {
    markPlayed(['a', 'b'])
    markPlayed(['b', 'c'])
    expect(getPlayedIds()).toEqual(new Set(['a', 'b', 'c']))
    unmarkPlayed(['a', 'x'])
    expect(getPlayedIds()).toEqual(new Set(['b', 'c']))
    resetPlayed()
    expect(getPlayedIds()).toEqual(new Set())
  })

  it('treats damaged data as nothing played', () => {
    localStorage.setItem(KEYS.played, JSON.stringify({ not: 'a list' }))
    expect(getPlayedIds()).toEqual(new Set())
  })
})

describe('last setup', () => {
  it('remembers teams and options', () => {
    const setup = {
      teams: makeTeams(3),
      options: { ...TEST_OPTIONS, secondsPerQuestion: 45 as const },
    }
    saveLastSetup(setup)
    expect(loadLastSetup()).toEqual(setup)
  })

  it('returns null for nothing or damaged data', () => {
    expect(loadLastSetup()).toBeNull()
    localStorage.setItem(KEYS.lastSetup, JSON.stringify({ teams: 'x' }))
    expect(loadLastSetup()).toBeNull()
  })
})
