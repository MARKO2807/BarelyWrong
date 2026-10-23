// The only module that touches local storage (see CLAUDE.md).

export { authStorage, hasEditorSession } from './auth'
export {
  clearGame,
  hasUnfinishedGame,
  loadGame,
  saveGame,
  type GameLog,
  type SavedGame,
} from './game'
export { KEYS } from './keys'
export { loadLastSetup, saveLastSetup } from './lastSetup'
export {
  enqueue,
  readOutbox,
  removeFromOutbox,
  type NewOutboxItem,
  type OutboxItem,
} from './outbox'
export { getPlayedIds, markPlayed, resetPlayed, unmarkPlayed } from './played'
export {
  DEFAULT_SETTINGS,
  THEMES,
  loadSettings,
  saveSettings,
  type Settings,
  type Theme,
} from './settings'
