import type { CSSProperties } from 'react'
import type { Team, TeamColor } from '../../engine'

/** Sets --team and --on-team-color for a team, for .team-chip, .btn-team and friends. */
export function teamStyle(color: TeamColor): CSSProperties {
  return {
    '--team': `var(--team-${color})`,
    '--on-team-color': color === 'pink' ? 'var(--on-team-pink)' : 'var(--on-team)',
  } as CSSProperties
}

/** First letter of a team name, for its chip ("Lisice" → "L"). */
export function teamInitial(name: string): string {
  return [...name.trim()][0]?.toLocaleUpperCase('hr') ?? ''
}

/** A square of the team's colour with the first letter of its name. Size follows the font size. */
export function TeamChip({
  color,
  name = '',
  className = '',
}: {
  color: TeamColor
  name?: string
  className?: string
}) {
  return (
    <span aria-hidden="true" className={`team-chip ${className}`} style={teamStyle(color)}>
      <span className="font-display text-[0.6em] leading-none font-extrabold">
        {teamInitial(name)}
      </span>
    </span>
  )
}

/** "Ana, Ivo i Marko" */
export function joinNames(teams: readonly Team[], and: string): string {
  const names = teams.map((team) => team.name)
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')}${and}${names.at(-1)}`
}
