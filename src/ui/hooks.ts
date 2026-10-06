import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/** Current time, refreshed every `intervalMs` while `active`. */
export function useNow(active: boolean, intervalMs = 200): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const update = () => setNow(Date.now())
    const id = window.setInterval(update, intervalMs)
    const first = window.setTimeout(update, 0)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(first)
    }
  }, [active, intervalMs])
  return now
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}

export function useFullscreen(): { isFullscreen: boolean; toggle: () => void } {
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  )
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])
  return { isFullscreen, toggle }
}

/** Keeps the screen on (Screen Wake Lock API) while `active`; re-acquired when the tab returns. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) void sentinel.release()
        else lock = sentinel
      } catch {
        // Not allowed (battery saver, unsupported context): the game works without it.
      }
    }
    void acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release()
    }
  }, [active])
}
