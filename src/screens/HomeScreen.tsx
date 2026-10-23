import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useGameSession } from '../app/GameSession'
import { ROUTES } from '../app/routes'
import { useSettings } from '../app/SettingsProvider'
import { t } from '../i18n'
import { hasUnfinishedGame } from '../storage'
import { Button, ButtonLink } from '../ui/Button'
import { Header } from '../ui/Header'
import { HeroImage } from '../ui/HeroImage'
import { Logo } from '../ui/Logo'
import { useDocumentTitle } from '../ui/useDocumentTitle'

const AUTHOR_URL = 'https://markobare.dev/'

export function HomeScreen() {
  useDocumentTitle()
  const { settings } = useSettings()
  const { resume } = useGameSession()
  const navigate = useNavigate()
  const [canContinue] = useState(hasUnfinishedGame)

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <HeroImage theme={settings.theme} />
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-safe-x pt-8 pb-(--hero-lift)">
        <div className="hero-glow flex flex-col items-center gap-6 text-center">
          <h1>
            <Logo variant="hero" className="hero-logo h-auto w-(--logo-hero-width)" />
          </h1>
          <p className="hero-text-shadow max-w-(--logo-hero-width) font-terminal text-(length:--tagline-font-size) leading-[1.1] text-balance">
            {t('app.tagline')}
          </p>
          <ButtonLink to={ROUTES.newGame} size="hero" className="play-cta mt-2">
            {t('nav.play')}
          </ButtonLink>
          {canContinue && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                if (resume()) navigate(ROUTES.game)
              }}
            >
              {t('nav.continueGame')}
            </Button>
          )}
        </div>
      </main>
      {/* Bottom left, under the hunter; out of the flow, so it never pushes the Igraj button. */}
      <footer className="absolute bottom-safe-y left-safe-x z-10 max-w-[calc(100%-2*var(--spacing-safe-x))]">
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
          <span>{t('credit.prefix')}</span>
          <span className="credit-name">{t('credit.name')}</span>
          <span className="credit-caret" aria-hidden="true">
            _
          </span>
        </a>
      </footer>
    </div>
  )
}
