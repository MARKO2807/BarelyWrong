import { useId, useState, type ReactNode } from 'react'
import { ROUTES } from '../../app/routes'
import { useSettings } from '../../app/SettingsProvider'
import { t } from '../../i18n'
import { THEMES, resetPlayed } from '../../storage'
import { Button, ButtonLink } from '../Button'
import { Modal } from '../Modal'
import { SegmentedControl } from '../SegmentedControl'
import { Toggle } from '../Toggle'

interface DialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: DialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('settings.title')}
      footer={
        <Button size="lg" onClick={onClose}>
          {t('common.done')}
        </Button>
      }
    >
      <SettingsContent onLeave={onClose} />
    </Modal>
  )
}

function SettingsContent({ onLeave }: { onLeave: () => void }) {
  const { settings, updateSettings } = useSettings()
  const soundId = useId()
  const themeId = useId()
  const playedId = useId()
  const adminId = useId()

  return (
    <div className="flex flex-col divide-y-2 divide-border">
      <SettingRow
        titleId={soundId}
        title={t('settings.sound.label')}
        description={t('settings.sound.description')}
      >
        <Toggle
          checked={settings.sound}
          onChange={(sound) => updateSettings({ sound })}
          labelledBy={soundId}
          onLabel={t('settings.sound.on')}
          offLabel={t('settings.sound.off')}
        />
      </SettingRow>

      <SettingRow
        titleId={themeId}
        title={t('settings.theme.label')}
        description={t('settings.theme.description')}
      >
        <SegmentedControl
          name="theme"
          value={settings.theme}
          options={THEMES.map((value) => ({
            value,
            label: t(`settings.theme.${value}`),
          }))}
          onChange={(theme) => updateSettings({ theme })}
          labelledBy={themeId}
        />
      </SettingRow>

      <SettingRow
        titleId={playedId}
        title={t('settings.played.label')}
        description={t('settings.played.description')}
      >
        <ResetPlayed />
      </SettingRow>

      <SettingRow
        titleId={adminId}
        title={t('settings.admin.label')}
        description={t('settings.admin.description')}
      >
        <ButtonLink variant="secondary" size="md" to={ROUTES.editor} onClick={onLeave}>
          {t('settings.admin.open')}
        </ButtonLink>
      </SettingRow>
    </div>
  )
}

interface SettingRowProps {
  titleId: string
  title: string
  description: string
  children: ReactNode
}

function SettingRow({ titleId, title, description, children }: SettingRowProps) {
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="min-w-0">
        <h3 id={titleId} className="font-display text-2xl font-extrabold">
          {title}
        </h3>
        <p className="mt-1 text-pretty text-text-muted">{description}</p>
      </div>
      <div className="shrink-0 sm:max-w-[60%]">{children}</div>
    </section>
  )
}

/** "initial": untouched; "idle": back after cancelling, so focus returns to the button. */
type ResetStatus = 'initial' | 'idle' | 'confirm' | 'done' | 'failed'

function ResetPlayed() {
  const [status, setStatus] = useState<ResetStatus>('initial')

  const message =
    status === 'done'
      ? t('settings.played.success')
      : status === 'failed'
        ? t('settings.played.failure')
        : ''

  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      {status === 'confirm' ? (
        <>
          <p className="font-semibold sm:text-right">{t('settings.played.confirmQuestion')}</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={() => setStatus('idle')} autoFocus>
              {t('common.cancel')}
            </Button>
            <Button size="md" onClick={() => setStatus(resetPlayed() ? 'done' : 'failed')}>
              {t('settings.played.confirm')}
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onClick={() => setStatus('confirm')}
          autoFocus={status !== 'initial'}
        >
          {t('settings.played.reset')}
        </Button>
      )}
      <p role="status" className={status === 'failed' ? 'text-wrong' : 'text-correct'}>
        {message}
      </p>
    </div>
  )
}
