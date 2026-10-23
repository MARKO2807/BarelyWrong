import { useLayoutEffect, useRef } from 'react'

interface FitTextProps {
  text: string
  /** Size range in rem; the text gets the largest size that fits its box without scrolling. */
  minRem: number
  maxRem: number
  className?: string
}

/**
 * Fills the available space: short questions get huge type, long ones shrink to fit. A word wider
 * than the box at the smallest size is broken; if the text is still too tall (a long question on a
 * small phone), the box scrolls.
 */
export function FitText({ text, minRem, maxRem, className }: FitTextProps) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const fit = () => {
      const container = box.current
      const element = inner.current
      if (!container || !element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      // A word wider than its line (the line has a max width in ch) sticks out of the text.
      const overflows = () =>
        element.scrollWidth > element.clientWidth || container.scrollWidth > container.clientWidth
      const search = () => {
        let low = minRem * rem
        let high = maxRem * rem
        for (let i = 0; i < 12; i++) {
          const size = (low + high) / 2
          element.style.fontSize = `${size}px`
          if (element.scrollHeight <= container.clientHeight && !overflows()) low = size
          else high = size
        }
        element.style.fontSize = `${low}px`
      }
      element.style.overflowWrap = 'normal'
      search()
      if (overflows()) {
        element.style.overflowWrap = 'anywhere'
        search()
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box.current!)
    void document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [text, minRem, maxRem])

  return (
    <div
      ref={box}
      className="flex min-h-0 w-full flex-1 items-center-safe justify-center overflow-x-hidden overflow-y-auto [scrollbar-width:none]"
    >
      <p ref={inner} className={className}>
        {text}
      </p>
    </div>
  )
}
