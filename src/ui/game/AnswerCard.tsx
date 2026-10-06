import type { Question } from '../../engine'
import { t } from '../../i18n'

export interface Verdict {
  correct: boolean
  label: string
}

/** The revealed answer: what else counts, the fun fact, and the host's verdict once given. */
export function AnswerCard({ question, verdict }: { question: Question; verdict: Verdict | null }) {
  const border = verdict ? (verdict.correct ? 'border-correct' : 'border-wrong') : 'border-primary'
  return (
    <div
      className={`reveal-in relative w-full max-w-5xl shrink-0 rounded-lg border-2 bg-surface px-8 py-5 text-center shadow-(--glow-primary) transition-colors ${border}`}
    >
      {verdict && (
        <span
          key={verdict.label}
          className={`pop-in absolute -top-5 left-1/2 -translate-x-1/2 rounded-md px-4 py-1 font-display text-xl font-extrabold whitespace-nowrap text-bg ${
            verdict.correct ? 'bg-correct' : 'bg-wrong'
          }`}
        >
          {verdict.label}
        </span>
      )}
      <p className="font-display text-(length:--answer-size) leading-tight font-extrabold text-balance text-primary-text">
        {question.answer}
      </p>
      {question.accept.length > 0 && (
        <p className="mt-1 text-xl text-text-muted">
          {t('game.alsoAccepted', { list: question.accept.join(', ') })}
        </p>
      )}
      {question.note && (
        <p className="mt-3 text-xl text-pretty">
          <span className="font-display font-extrabold text-secondary-text">
            {t('game.note')}:{' '}
          </span>
          {question.note}
        </p>
      )}
    </div>
  )
}
