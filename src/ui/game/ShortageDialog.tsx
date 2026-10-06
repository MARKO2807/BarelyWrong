import type { ShortageState } from '../../app/useStartGame'
import { t } from '../../i18n'
import { Button } from '../Button'
import { Modal } from '../Modal'

interface ShortageDialogProps {
  shortage: ShortageState | null
  busy: boolean
  onRestore: () => void
  onClose: () => void
}

/** Spec 4.9: when a round kind runs out, offer to bring its played questions back. */
export function ShortageDialog({ shortage, busy, onRestore, onClose }: ShortageDialogProps) {
  return (
    <Modal
      open={shortage !== null}
      onClose={onClose}
      title={t('setup.shortage.title')}
      footer={
        shortage?.afterRestore ? (
          <Button onClick={onClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onRestore} disabled={busy}>
              {busy ? t('setup.starting') : t('setup.shortage.restore')}
            </Button>
          </>
        )
      }
    >
      {shortage && (
        <div className="flex flex-col gap-3">
          <p>{t('setup.shortage.text')}</p>
          <ul className="list-disc pl-6">
            {shortage.shortages.map((item) => (
              <li key={item.kind}>
                {t('setup.shortage.item', {
                  kind: t(`topics.${item.kind}`),
                  needed: item.needed,
                  available: item.available,
                })}
              </li>
            ))}
          </ul>
          {shortage.afterRestore && (
            <p className="font-semibold text-wrong">{t('setup.shortage.stillShort')}</p>
          )}
        </div>
      )}
    </Modal>
  )
}
