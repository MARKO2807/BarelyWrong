import { useEffect, useRef, type CSSProperties } from 'react'
import { isTimerRunning, remainingMs, type Timer } from '../../engine'
import { t } from '../../i18n'
import { useNow } from '../hooks'
import type { SoundName } from '../sound/sfx'
import { useSound } from '../sound/useSound'

const URGENT_SECONDS = 10

/** A warning when the last ten seconds start, then a tick for each of the last three. */
function tickSound(seconds: number): SoundName | null {
  if (seconds === URGENT_SECONDS) return 'warning'
  return seconds <= 3 ? 'tick' : null
}

interface GameTimerProps {
  timer: Timer
  /** Called once when time runs out, to reveal the answer. */
  onExpire: () => void
}

/**
 * Big countdown with a bar. In the last ten seconds it turns red, glows and shakes, a little
 * more every second.
 */
export function GameTimer({ timer, onExpire }: GameTimerProps) {
  const running = isTimerRunning(timer)
  const now = useNow(running, 100)
  const remaining = remainingMs(timer, now)
  const seconds = Math.ceil(remaining / 1000)
  const urgent = seconds <= URGENT_SECONDS
  const play = useSound()
  const lastTick = useRef<number | null>(null)

  useEffect(() => {
    if (running && urgent && seconds > 0 && lastTick.current !== seconds) {
      lastTick.current = seconds
      const sound = tickSound(seconds)
      if (sound) play(sound)
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
      data-urgent={urgent ? (running && remaining > 0 ? 'running' : 'still') : undefined}
      className="timer flex w-full max-w-4xl shrink-0 items-center gap-6"
      style={{ '--intensity': intensity } as CSSProperties}
    >
      <span
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
      {!running && remaining > 0 && (
        <span className="font-display text-2xl font-extrabold text-text-muted">
          {t('game.paused')}
        </span>
      )}
    </div>
  )
}
