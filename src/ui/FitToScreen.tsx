import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Large landscape screens (laptop, TV) show the whole page at once; phones and tablets scroll. */
const BIG_SCREEN = '(min-width: 64rem) and (orientation: landscape)'
const MIN_ZOOM = 0.6

/**
 * Fills the space it is given and, on large landscape screens, scales its content down
 * (CSS zoom, so layout and clicks stay exact) when it would not fit without scrolling.
 */
export function FitToScreen({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const box = outer.current
    const content = inner.current
    if (!box || !content) return
    const query = window.matchMedia(BIG_SCREEN)
    const fit = () => {
      content.style.zoom = ''
      if (!query.matches) return
      const needed = content.scrollHeight
      const available = box.clientHeight
      if (needed > available) content.style.zoom = String(Math.max(MIN_ZOOM, available / needed))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    observer.observe(content)
    query.addEventListener('change', fit)
    void document.fonts?.ready.then(fit)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', fit)
    }
  }, [])

  return (
    <div ref={outer} className={`flex min-h-0 w-full flex-1 flex-col ${className ?? ''}`}>
      <div ref={inner} className="m-auto flex w-full flex-col items-center">
        {children}
      </div>
    </div>
  )
}
