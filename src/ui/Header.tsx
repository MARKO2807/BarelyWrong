import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../app/routes'
import { t } from '../i18n'
import { ButtonLink } from './Button'
import { HowToPlayDialog } from './dialogs/HowToPlayDialog'
import { SettingsDialog } from './dialogs/SettingsDialog'
import { IconButton } from './IconButton'
import { Logo } from './Logo'
import { GearIcon, QuestionIcon } from './pixel/icons'

type OpenDialog = 'howToPlay' | 'settings' | null

export function Header() {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const closeDialog = useCallback(() => setOpenDialog(null), [])

  return (
    <header className="relative z-10 flex items-center justify-between gap-4 px-safe-x pt-safe-y">
      <Link to={ROUTES.home} className="shrink-0 rounded-sm">
        <Logo variant="header" className="h-(--logo-header-height) w-auto" />
      </Link>

      <nav aria-label={t('nav.label')} className="flex items-center gap-1 sm:gap-3">
        <button type="button" className="header-link" onClick={() => setOpenDialog('howToPlay')}>
          <QuestionIcon className="sm:hidden" />
          <span className="max-sm:sr-only">{t('nav.howToPlay')}</span>
        </button>
        <IconButton label={t('nav.settings')} onClick={() => setOpenDialog('settings')}>
          <GearIcon />
        </IconButton>
        <ButtonLink to={ROUTES.newGame} size="lg" className="ml-2 sm:ml-3">
          {t('nav.play')}
        </ButtonLink>
      </nav>

      <HowToPlayDialog open={openDialog === 'howToPlay'} onClose={closeDialog} />
      <SettingsDialog open={openDialog === 'settings'} onClose={closeDialog} />
    </header>
  )
}
