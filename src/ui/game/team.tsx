import type { CSSProperties } from 'react'
import type { Team, TeamColor, TeamIcon } from '../../engine'
import { TEAM_ICON_GLYPHS } from '../icons'

/** Sets --team and --on-team-color for a team, for .team-chip, .btn-team and friends. */
export function teamStyle(color: TeamColor): CSSProperties {
  return {
    '--team': `var(--team-${color})`,
    '--on-team-color': color === 'pink' ? 'var(--on-team-pink)' : 'var(--on-team)',
  } as CSSProperties
}

/** The team's icon on a square of its colour. Size follows the font size. */
export function TeamChip({
  color,
  icon,
  className = '',
}: {
  color: TeamColor
  icon: TeamIcon
  className?: string
}) {
  const Icon = TEAM_ICON_GLYPHS[icon]
  return (
    <span aria-hidden="true" className={`team-chip ${className}`} style={teamStyle(color)}>
      <Icon className="text-[0.62em]" />
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
