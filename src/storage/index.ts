// The only module that touches local storage (see CLAUDE.md).

export { clearGame, hasUnfinishedGame, loadGame, saveGame, type SavedGame } from './game'
export { KEYS } from './keys'
export { loadLastSetup, saveLastSetup } from './lastSetup'
export {
  REPORT_REASONS,
  enqueue,
  readOutbox,
  removeFromOutbox,
  type NewOutboxItem,
  type OutboxItem,
  type ReportReason,
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
