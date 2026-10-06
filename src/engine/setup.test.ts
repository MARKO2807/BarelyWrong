import { describe, expect, it } from 'vitest'
import { estimatedDurationSeconds, normalizeTeamName, validateSetup } from './setup'
import { TEST_OPTIONS, makeTeams } from './testing/fixtures'

describe('validateSetup', () => {
  it('accepts 2–4 teams with names and different colours', () => {
    for (const count of [2, 3, 4]) {
      expect(validateSetup({ teams: makeTeams(count), options: TEST_OPTIONS })).toEqual([])
    }
  })

  it('needs between 2 and 4 teams', () => {
    for (const count of [1, 5]) {
      const teams = Array.from({ length: count }, (_, i) => ({
        ...makeTeams(4)[i % 4]!,
        id: `x${i}`,
        name: `Tim ${i}`,
        color: (['pink', 'cyan', 'amber', 'purple', 'blue'] as const)[i]!,
      }))
      expect(validateSetup({ teams, options: TEST_OPTIONS })).toContainEqual({ type: 'teamCount' })
    }
  })

  it('needs a name of at most 20 characters', () => {
    const [a, b, c] = makeTeams(3)
    const problems = validateSetup({
      teams: [
        { ...a!, name: '   ' },
        { ...b!, name: 'Đurđevački šampioni!' }, // 20 characters with diacritics
        { ...c!, name: 'Ovo ime ima previše z' },
      ],
      options: TEST_OPTIONS,
    })
    expect(problems).toEqual([
      { type: 'nameMissing', teamId: a!.id },
      { type: 'nameTooLong', teamId: c!.id },
    ])
  })

  it('flags a repeated name or colour on the later team', () => {
    const [a, b, c] = makeTeams(3)
    const problems = validateSetup({
      teams: [a!, { ...b!, name: '  tim   1 ' }, { ...c!, color: a!.color }],
      options: TEST_OPTIONS,
    })
    expect(problems).toEqual([
      { type: 'nameTaken', teamId: b!.id },
      { type: 'colorTaken', teamId: c!.id },
    ])
  })

  it('rejects options outside the allowed values', () => {
    const options = { ...TEST_OPTIONS, secondsPerQuestion: 50 } as unknown as typeof TEST_OPTIONS
    expect(validateSetup({ teams: makeTeams(2), options })).toContainEqual({ type: 'options' })
  })
})

describe('normalizeTeamName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeTeamName('  Mudri   sovuljagi ')).toBe('Mudri sovuljagi')
  })
})

describe('estimatedDurationSeconds', () => {
  it('is teams × rounds × (time per question + 30 s)', () => {
    expect(estimatedDurationSeconds(3, TEST_OPTIONS)).toBe(3 * 12 * 90)
    expect(
      estimatedDurationSeconds(2, { ...TEST_OPTIONS, length: 'short', secondsPerQuestion: 30 }),
    ).toBe(2 * 6 * 60)
  })
})
