import { useEffect, useRef } from 'react'
import { isTimerRunning, remainingMs, type Timer } from '../../engine'
import { t } from '../../i18n'
import { useNow } from '../hooks'
import { useSound } from '../sound/useSound'

const URGENT_SECONDS = 10

interface GameTimerProps {
  timer: Timer
  /** Called once when time runs out, to reveal the answer. */
  onExpire: () => void
}

/** Big countdown with a bar; turns red and ticks in the last ten seconds. */
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
      play('tick')
    }
  }, [running, urgent, seconds, play])

  useEffect(() => {
    if (running && remaining <= 0) onExpire()
  }, [running, remaining, onExpire])

  return (
    <div
      role="timer"
      aria-label={t('game.secondsLeft')}
      className="flex w-full max-w-4xl shrink-0 items-center gap-6"
    >
      <span
        className={`w-[2ch] text-right font-terminal text-(length:--timer-size) leading-none tabular-nums ${urgent ? 'timer-urgent' : ''}`}
      >
        {seconds}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface">
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
