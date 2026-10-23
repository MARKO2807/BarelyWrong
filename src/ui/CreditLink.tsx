import { useEffect, useState } from 'react'
import { t } from '../i18n'

const AUTHOR_URL = 'https://markobare.dev/'

/** Typing rhythm in ms: per letter typed, per letter erased, full text shown, empty. */
const TYPE = 75
const ERASE = 35
const HOLD = 2600
const EMPTY = 500

/** How many letters are shown, looping: type, hold, erase, pause. Static when motion is off. */
function useTyping(length: number): number {
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [shown, setShown] = useState(still ? length : 0)
  useEffect(() => {
    if (still) return
    let count = 0
    let typing = true
    let timer = 0
    const step = () => {
      if (typing) count++
      else count--
      setShown(count)
      if (typing && count === length) typing = false
      else if (!typing && count === 0) typing = true
      const wait =
        count === length && !typing ? HOLD : count === 0 && typing ? EMPTY : typing ? TYPE : ERASE
      timer = window.setTimeout(step, wait)
    }
    timer = window.setTimeout(step, EMPTY)
    return () => window.clearTimeout(timer)
  }, [length, still])
  return shown
}

/**
 * Developed by Marko Bare: a small terminal tag that types itself out over and over. The full text
 * sits invisibly underneath, so the tag keeps its width while typing; screen readers get the label.
 */
export function CreditLink() {
  const prefix = `${t('credit.prefix')} `
  const name = t('credit.name')
  const shown = useTyping(prefix.length + name.length)
  const text = (
    <>
      {prefix}
      <span className="credit-name">{name}</span>
    </>
  )
  return (
    <a
      href={AUTHOR_URL}
      target="_blank"
      rel="noopener"
      className="credit-link"
      aria-label={t('credit.label')}
    >
      <span className="credit-code" aria-hidden="true">
        {'</>'}
      </span>
      <span className="grid" aria-hidden="true">
        <span className="invisible col-start-1 row-start-1 whitespace-pre">{text}</span>
        <span className="col-start-1 row-start-1 whitespace-pre">
          {prefix.slice(0, shown)}
          <span className="credit-name">{name.slice(0, Math.max(0, shown - prefix.length))}</span>
        </span>
      </span>
    </a>
  )
}
