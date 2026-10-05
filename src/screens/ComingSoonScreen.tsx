import { ROUTES } from '../app/routes'
import { t } from '../i18n'
import { ButtonLink } from '../ui/Button'
import { PageShell } from '../ui/PageShell'
import { useDocumentTitle } from '../ui/useDocumentTitle'

/** Placeholder for screens built in later phases. */
export function ComingSoonScreen() {
  useDocumentTitle(t('comingSoon.title'))
  return (
    <PageShell>
      <h1 className="font-display text-5xl font-semibold text-primary-text">
        {t('comingSoon.title')}
      </h1>
      <p className="max-w-xl text-xl text-balance text-text-muted">{t('comingSoon.text')}</p>
      <ButtonLink to={ROUTES.home} variant="secondary">
        {t('common.backHome')}
      </ButtonLink>
    </PageShell>
  )
}
