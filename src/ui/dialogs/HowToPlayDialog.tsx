import { t, tList } from '../../i18n'
import { Button } from '../Button'
import { Modal } from '../Modal'

interface DialogProps {
  open: boolean
  onClose: () => void
}

/** All the rules in one list that scrolls; the confirm button stays in view below it. */
export function HowToPlayDialog({ open, onClose }: DialogProps) {
  const steps = tList('howToPlay.steps')
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('howToPlay.title')}
      footer={
        <Button size="lg" onClick={onClose}>
          {t('howToPlay.confirm')}
        </Button>
      }
    >
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary font-display text-xl font-extrabold text-on-primary"
            >
              {index + 1}
            </span>
            <p className="pt-1.5 text-lg leading-snug sm:text-xl">{step}</p>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
