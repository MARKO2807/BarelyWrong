import { useLayoutEffect, useRef } from 'react'

interface FitTextProps {
  text: string
  /** Size range in rem; the text gets the largest size that fits its box without scrolling. */
  minRem: number
  maxRem: number
  className?: string
}

/** Fills the available space: short questions get huge type, long ones shrink to fit. */
export function FitText({ text, minRem, maxRem, className }: FitTextProps) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const fit = () => {
      const container = box.current
      const element = inner.current
      if (!container || !element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      let low = minRem * rem
      let high = maxRem * rem
      for (let i = 0; i < 12; i++) {
        const size = (low + high) / 2
        element.style.fontSize = `${size}px`
        const fits =
          element.scrollHeight <= container.clientHeight &&
          element.scrollWidth <= container.clientWidth
        if (fits) low = size
        else high = size
      }
      element.style.fontSize = `${low}px`
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
      className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
    >
      <p ref={inner} className={className}>
        {text}
      </p>
    </div>
  )
}
