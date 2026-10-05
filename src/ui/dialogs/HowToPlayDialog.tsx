import { t, tList } from '../../i18n'
import { Button } from '../Button'
import { Modal } from '../Modal'

interface DialogProps {
  open: boolean
  onClose: () => void
}

export function HowToPlayDialog({ open, onClose }: DialogProps) {
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
      <ol className="flex flex-col gap-4">
        {tList('howToPlay.steps').map((step, index) => (
          <li key={step} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-sm bg-primary font-display text-xl font-extrabold text-on-primary"
            >
              {index + 1}
            </span>
            <p className="pt-1.5 text-xl leading-snug">{step}</p>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
