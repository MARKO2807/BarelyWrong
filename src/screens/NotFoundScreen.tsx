import { ROUTES } from '../app/routes'
import { t } from '../i18n'
import { ButtonLink } from '../ui/Button'
import { PageShell } from '../ui/PageShell'
import { useDocumentTitle } from '../ui/useDocumentTitle'

export function NotFoundScreen() {
  useDocumentTitle(t('notFound.pageTitle'))
  return (
    <PageShell>
      <h1 className="font-terminal text-5xl text-primary-text">{t('notFound.title')}</h1>
      <p className="max-w-xl text-xl text-balance text-text-muted">{t('notFound.text')}</p>
      <ButtonLink to={ROUTES.home} variant="secondary">
        {t('common.backHome')}
      </ButtonLink>
    </PageShell>
  )
}
