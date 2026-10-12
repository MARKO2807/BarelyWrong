import { useState } from 'react'
import { t, tList } from '../../i18n'
import { Button } from '../Button'
import { IconButton } from '../IconButton'
import { ArrowLeftIcon, ArrowRightIcon } from '../icons'
import { Modal } from '../Modal'

interface DialogProps {
  open: boolean
  onClose: () => void
}

const PER_PAGE = 5

export function HowToPlayDialog({ open, onClose }: DialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={t('howToPlay.title')}>
      <RulePages onClose={onClose} />
    </Modal>
  )
}

/** The rules in pages of five, so the popup never needs scrolling; arrows or ← → turn the page. */
function RulePages({ onClose }: { onClose: () => void }) {
  const steps = tList('howToPlay.steps')
  const pageCount = Math.ceil(steps.length / PER_PAGE)
  const [page, setPage] = useState(0)
  const first = page * PER_PAGE
  const last = page === pageCount - 1
  const go = (next: number) => setPage(Math.min(pageCount - 1, Math.max(0, next)))

  return (
    <div
      className="flex flex-col gap-5"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(page + 1)
        else if (event.key === 'ArrowLeft') go(page - 1)
        else return
        event.preventDefault()
      }}
    >
      <ol key={page} start={first + 1} className="rules-page flex flex-col gap-3">
        {steps.slice(first, first + PER_PAGE).map((step, index) => (
          <li key={step} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary font-display text-xl font-extrabold text-on-primary"
            >
              {first + index + 1}
            </span>
            <p className="pt-1.5 text-xl leading-snug">{step}</p>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3 border-t-2 border-border pt-4">
        <IconButton
          label={t('howToPlay.previous')}
          onClick={() => go(page - 1)}
          disabled={page === 0}
          className="pager-btn"
        >
          <ArrowLeftIcon />
        </IconButton>
        <div className="flex items-center gap-2" aria-live="polite">
          <span className="sr-only">
            {t('howToPlay.page', { current: page + 1, total: pageCount })}
          </span>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={t('howToPlay.page', { current: index + 1, total: pageCount })}
              aria-current={index === page ? 'step' : undefined}
              onClick={() => go(index)}
              className={`size-3 rounded-full transition-colors ${index === page ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </div>
        {last ? (
          <Button size="lg" onClick={onClose}>
            {t('howToPlay.confirm')}
          </Button>
        ) : (
          <IconButton
            label={t('howToPlay.next')}
            onClick={() => go(page + 1)}
            className="pager-btn"
          >
            <ArrowRightIcon />
          </IconButton>
        )}
      </div>
    </div>
  )
}
