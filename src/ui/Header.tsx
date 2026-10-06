import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../app/routes'
import { t } from '../i18n'
import { HowToPlayDialog } from './dialogs/HowToPlayDialog'
import { SettingsDialog } from './dialogs/SettingsDialog'
import { RulesIcon, SettingsIcon } from './icons'
import { Logo } from './Logo'

type OpenDialog = 'howToPlay' | 'settings' | null

/** Logo, Pravila and Postavke. Playing starts from the big button on the home page. */
export function Header() {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const closeDialog = useCallback(() => setOpenDialog(null), [])

  return (
    <header className="relative z-10 flex items-center justify-between gap-4 px-safe-x pt-safe-y">
      <Link to={ROUTES.home} className="shrink-0 rounded-sm">
        <Logo variant="header" className="header-logo h-(--logo-header-height) w-auto" />
      </Link>

      <nav aria-label={t('nav.label')} className="flex items-center gap-2 sm:gap-3">
        <button type="button" className="header-link" onClick={() => setOpenDialog('howToPlay')}>
          <RulesIcon />
          <span className="max-sm:sr-only">{t('nav.howToPlay')}</span>
        </button>
        <button
          type="button"
          className="header-link header-settings"
          onClick={() => setOpenDialog('settings')}
        >
          <SettingsIcon className="header-settings-icon" />
          <span className="max-lg:sr-only">{t('nav.settings')}</span>
        </button>
      </nav>

      <HowToPlayDialog open={openDialog === 'howToPlay'} onClose={closeDialog} />
      <SettingsDialog open={openDialog === 'settings'} onClose={closeDialog} />
    </header>
  )
}
