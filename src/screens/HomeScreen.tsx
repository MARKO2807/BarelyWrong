import { ROUTES } from '../app/routes'
import { useSettings } from '../app/SettingsProvider'
import { t } from '../i18n'
import { ButtonLink } from '../ui/Button'
import { Header } from '../ui/Header'
import { HeroImage } from '../ui/HeroImage'
import { Logo } from '../ui/Logo'
import { PlayIcon } from '../ui/pixel/icons'
import { useDocumentTitle } from '../ui/useDocumentTitle'

export function HomeScreen() {
  useDocumentTitle()
  const { resolvedTheme } = useSettings()

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <HeroImage theme={resolvedTheme} />
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-safe-x pt-8 pb-(--hero-lift)">
        <div className="hero-glow flex flex-col items-center gap-6 text-center">
          <h1>
            <Logo variant="hero" className="h-auto w-(--logo-hero-width)" />
          </h1>
          <p className="hero-text-shadow max-w-(--logo-hero-width) font-terminal text-3xl leading-tight text-balance sm:text-4xl">
            {t('app.tagline')}
          </p>
          <ButtonLink to={ROUTES.newGame} size="xl" icon={<PlayIcon />} className="mt-2">
            {t('nav.play')}
          </ButtonLink>
        </div>
      </main>
    </div>
  )
}
