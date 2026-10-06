import { TEAM_ICONS } from '../engine'

/** For data saved before teams had icons: each team gets the next icon in the list. */
export function withTeamIcons(teams: readonly unknown[]): unknown[] {
  return teams.map((team, i) => ({ ...(team as object), icon: TEAM_ICONS[i % TEAM_ICONS.length] }))
}
