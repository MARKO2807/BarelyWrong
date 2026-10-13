import { useEffect, useRef, type CSSProperties } from 'react'
import { isTimerRunning, remainingMs, type Timer } from '../../engine'
import { t } from '../../i18n'
import { useNow } from '../hooks'
import type { SoundName } from '../sound/sfx'
import { useSound } from '../sound/useSound'

const URGENT_SECONDS = 10

/** How tense the countdown is: last ten seconds, last five, last three. */
type Phase = 'calm' | 'urgent' | 'critical' | 'final'

function phaseFor(seconds: number): Phase {
  if (seconds > URGENT_SECONDS) return 'calm'
  if (seconds > 5) return 'urgent'
  if (seconds > 3) return 'critical'
  return 'final'
}

function tickSound(seconds: number): SoundName {
  if (seconds === 3) return 'final3'
  if (seconds === 2) return 'final2'
  if (seconds === 1) return 'final1'
  return seconds <= 5 ? 'heartbeat' : 'tick'
}

interface GameTimerProps {
  timer: Timer
  /** Called once when time runs out, to reveal the answer. */
  onExpire: () => void
}

/**
 * Big countdown with a bar. In the last ten seconds it turns red and ticks; from five the
 * heartbeat joins and the screen edges beat harder, and the last three are the most intense.
 * Every beat restarts on the second, so sound and picture stay in step.
 */
export function GameTimer({ timer, onExpire }: GameTimerProps) {
  const running = isTimerRunning(timer)
  const now = useNow(running, 100)
  const remaining = remainingMs(timer, now)
  const seconds = Math.ceil(remaining / 1000)
  const phase = phaseFor(seconds)
  const urgent = phase !== 'calm'
  const beating = running && urgent && remaining > 0
  const play = useSound()
  const lastTick = useRef<number | null>(null)

  useEffect(() => {
    if (running && urgent && seconds > 0 && lastTick.current !== seconds) {
      lastTick.current = seconds
      play(tickSound(seconds))
    }
  }, [running, urgent, seconds, play])

  useEffect(() => {
    if (running && remaining <= 0) onExpire()
  }, [running, remaining, onExpire])

  // 0 at ten seconds, 1 at the last second.
  const intensity = urgent ? (URGENT_SECONDS - seconds) / (URGENT_SECONDS - 1) : 0

  return (
    <div
      role="timer"
      aria-label={t('game.secondsLeft')}
      data-phase={beating ? phase : undefined}
      className="timer flex w-full max-w-4xl shrink-0 items-center gap-6"
    >
      <span
        key={beating ? seconds : 'still'}
        className={`timer-digits w-[2ch] text-right font-body text-(length:--timer-size) leading-[1.15] font-semibold tabular-nums ${urgent ? 'text-wrong' : ''}`}
      >
        {seconds}
      </span>
      <div className="timer-track h-4 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ease-linear ${urgent ? 'bg-wrong' : 'bg-secondary'}`}
          style={{ width: `${(remaining / timer.durationMs) * 100}%` }}
        />
      </div>
      {beating && (
        <div
          key={seconds}
          aria-hidden="true"
          data-phase={phase}
          className="urgent-vignette"
          style={{ '--intensity': 0.4 + 0.6 * intensity } as CSSProperties}
        />
      )}
      {!running && remaining > 0 && (
        <span className="font-display text-2xl font-extrabold text-text-muted">
          {t('game.paused')}
        </span>
      )}
    </div>
  )
}
