import { ROUTES } from '../app/routes'
import type { GameState, ProgressEvent } from '../engine'
import { t } from '../i18n'
import { hasEditorSession, loadSettings } from '../storage'
import type { Screen } from './screens'
import { submit } from './sync'

// The editor's activity log (docs/SPEC.md 9.4): visits and games, without cookies, IP addresses,
// team names or a lasting device id. Nothing is recorded in development or on the editor's device.

/** Rough kind of screen from the window width (a TV that scales its picture may pass as laptop). */
export function screenOf(width: number): Screen {
  if (width <= 640) return 'phone'
  if (width <= 1024) return 'tablet'
  if (width <= 1600) return 'laptop'
  return 'large'
}

/** Host of the page the visitor came from; null for a direct visit or a link inside the site. */
export function referrerHost(referrer: string, ownHost: string): string | null {
  try {
    const host = new URL(referrer).host
    return host && host !== ownHost ? host.slice(0, 200) : null
  } catch {
    return null
  }
}

function enabled(): boolean {
  return !import.meta.env.DEV && !hasEditorSession()
}

function timeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64) || null
  } catch {
    return null
  }
}

const screen = () => screenOf(window.innerWidth)

/** Once per page load; the editor's pages don't count. */
export function recordVisit() {
  if (!enabled() || window.location.pathname.startsWith(ROUTES.editor)) return
  submit([
    {
      type: 'visit',
      path: window.location.pathname.slice(0, 200) || '/',
      screen: screen(),
      referrer: referrerHost(document.referrer, window.location.host),
      timeZone: timeZone(),
    },
  ])
}

export function recordGameStart(gameId: string, game: GameState, rematch: boolean) {
  if (!enabled()) return
  const { theme, sound } = loadSettings()
  const start = {
    type: 'gameStart' as const,
    gameId,
    teamCount: game.teams.length,
    length: game.options.length,
    secondsPerQuestion: game.options.secondsPerQuestion,
    fastestFinger: game.options.fastestFinger,
    rounds: game.rounds.map((round) => round.kind),
    rematch,
    screen: screen(),
    timeZone: timeZone(),
    theme,
    sound,
  }
  submit([start])
  void notifyByMail(start)
}

export function recordProgress(gameId: string, events: readonly ProgressEvent[]) {
  if (!enabled() || events.length === 0) return
  submit(events.map((e) => ({ type: 'gameProgress' as const, gameId, ...e })))
}

/** Prekini partiju, after `completedRounds` rounds. */
export function recordAbandon(gameId: string, completedRounds: number) {
  if (!enabled()) return
  submit([{ type: 'gameProgress', gameId, event: 'abandoned', round: completedRounds }])
}

/**
 * Netlify Forms sends the owner an e-mail for every new game: the hidden form "partija" in
 * index.html, posted in the background. Best effort; a lost e-mail doesn't matter.
 */
async function notifyByMail(start: {
  teamCount: number
  length: GameState['options']['length']
  secondsPerQuestion: number
  rematch: boolean
  screen: Screen
  timeZone: string | null
}) {
  const summary = t('activity.mail', {
    teams: start.teamCount,
    length: t(`activity.lengths.${start.length}`),
    seconds: start.secondsPerQuestion,
    screen: t(`activity.screens.${start.screen}`),
    rematch: start.rematch ? t('activity.rematch') : '',
    timeZone: start.timeZone ?? '?',
  })
  try {
    await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'form-name': 'partija', sazetak: summary }).toString(),
    })
  } catch {
    // Offline or blocked: the game itself is still recorded through the outbox.
  }
}
