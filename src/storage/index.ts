// The only module that touches local storage (see CLAUDE.md).

export { clearGame, hasUnfinishedGame, loadGame, saveGame, type SavedGame } from './game'
export { KEYS } from './keys'
export { loadLastSetup, saveLastSetup } from './lastSetup'
export { getPlayedIds, markPlayed, resetPlayed, unmarkPlayed } from './played'
export {
  DEFAULT_SETTINGS,
  THEMES,
  loadSettings,
  saveSettings,
  type Settings,
  type Theme,
} from './settings'
