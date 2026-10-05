import type { Timer } from './schema'

// Times are epoch milliseconds passed in by the caller, so the engine stays pure.

export function startTimer(durationMs: number, now: number): Timer {
  return { durationMs, elapsedMs: 0, runningSince: now }
}

export function isTimerRunning(timer: Timer): boolean {
  return timer.runningSince !== null
}

function elapsedAt(timer: Timer, now: number): number {
  const running = timer.runningSince === null ? 0 : Math.max(0, now - timer.runningSince)
  return Math.min(timer.durationMs, timer.elapsedMs + running)
}

export function remainingMs(timer: Timer, now: number): number {
  return timer.durationMs - elapsedAt(timer, now)
}

export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.runningSince === null) return timer
  return { ...timer, elapsedMs: elapsedAt(timer, now), runningSince: null }
}

export function resumeTimer(timer: Timer, now: number): Timer {
  if (timer.runningSince !== null || timer.elapsedMs >= timer.durationMs) return timer
  return { ...timer, runningSince: now }
}
