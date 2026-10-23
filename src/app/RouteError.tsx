import { useEffect } from 'react'
import { useRouteError } from 'react-router'
import { t } from '../i18n'
import { claimReload } from '../storage'
import { Button, ButtonLink } from '../ui/Button'
import { PageShell } from '../ui/PageShell'
import { useDocumentTitle } from '../ui/useDocumentTitle'
import { ROUTES } from './routes'

/** A code file of the old version is gone after a deploy (wording differs per browser). */
export function isMissingChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|module script/i.test(message)
}

/** Reloads once when the page needs code from a newer version; returns whether it does. */
export function reloadForNewVersion(error: unknown): boolean {
  if (!isMissingChunk(error) || !claimReload()) return false
  window.location.reload()
  return true
}

/**
 * Shown instead of a page that failed. A missing file from an older version reloads the page by
 * itself; anything else gets a calm message with Osvježi and the way home.
 */
export function RouteError() {
  const error = useRouteError()
  useDocumentTitle(t('error.pageTitle'))
  const updating = isMissingChunk(error)

  useEffect(() => {
    reloadForNewVersion(error)
  }, [error])

  return (
    <PageShell>
      <h1 className="font-terminal text-5xl text-primary-text">{t('error.title')}</h1>
      <p className="max-w-xl text-xl text-balance text-text-muted">
        {updating ? t('error.newVersion') : t('error.text')}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>{t('error.reload')}</Button>
        <ButtonLink to={ROUTES.home} variant="secondary">
          {t('common.backHome')}
        </ButtonLink>
      </div>
    </PageShell>
  )
}
