import { useEffect } from 'react'
import { t } from '../i18n'

/** Sets the browser tab title; without a page name it is just the app name. */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? t('meta.pageTitle', { page }) : t('meta.title')
  }, [page])
}
