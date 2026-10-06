import { useState } from 'react'
import { useSettings } from '../../app/SettingsProvider'
import { t } from '../../i18n'
import { Button } from '../Button'
import { Modal } from '../Modal'

interface GameMenuProps {
  open: boolean
  onClose: () => void
  isFullscreen: boolean
  onFullscreen: () => void
  /** Called after the second confirmation. */
  onAbort: () => void
}

/** Esc menu: continue, full screen, sound, and abandoning the game (asks twice). */
export function GameMenu({ open, onClose, isFullscreen, onFullscreen, onAbort }: GameMenuProps) {
  return (
    <Modal open={open} onClose={onClose} title={t('game.menu')}>
      <MenuContent
        onClose={onClose}
        isFullscreen={isFullscreen}
        onFullscreen={onFullscreen}
        onAbort={onAbort}
      />
    </Modal>
  )
}

function MenuContent({
  onClose,
  isFullscreen,
  onFullscreen,
  onAbort,
}: Omit<GameMenuProps, 'open'>) {
  const { settings, updateSettings } = useSettings()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col items-stretch gap-3">
      <Button size="lg" onClick={onClose}>
        {t('game.continue')}
      </Button>
      <Button variant="secondary" size="lg" onClick={onFullscreen}>
        {isFullscreen ? t('game.exitFullscreen') : t('game.fullscreen')}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => updateSettings({ sound: !settings.sound })}
      >
        {settings.sound ? t('game.soundOn') : t('game.soundOff')}
      </Button>
      {confirming ? (
        <div
          role="alertdialog"
          aria-label={t('game.abort')}
          className="flex flex-col gap-3 rounded-md border-2 border-wrong p-4"
        >
          <p className="text-xl font-semibold">{t('game.abortConfirm')}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)} autoFocus>
              {t('common.cancel')}
            </Button>
            <Button variant="wrong" onClick={onAbort}>
              {t('game.abortYes')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="lg" onClick={() => setConfirming(true)}>
          {t('game.abort')}
        </Button>
      )}
    </div>
  )
}
