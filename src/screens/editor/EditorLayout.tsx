import type { ReactNode } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router'
import { EDITOR_ROUTES, ROUTES } from '../../app/routes'
import { t } from '../../i18n'
import { Button, ButtonLink } from '../../ui/Button'
import { Logo } from '../../ui/Logo'
import { useEditorData } from './EditorData'
import { GamesPage } from './GamesPage'
import { ImportExportPage } from './ImportExportPage'
import { QuestionPage } from './QuestionPage'
import { QuestionsPage } from './QuestionsPage'
import { ReportsPage } from './ReportsPage'
import { ReviewPage } from './ReviewPage'

/** The editor's pages, below /admin. */
export function EditorRoutes() {
  return (
    <Routes>
      <Route index element={<QuestionsPage />} />
      <Route path="review" element={<ReviewPage />} />
      <Route path="question/:id" element={<QuestionPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="import" element={<ImportExportPage />} />
      <Route path="games" element={<GamesPage />} />
      <Route path="*" element={<p className="text-xl">{t('notFound.text')}</p>} />
    </Routes>
  )
}

/** Top bar with the editor's sections and their counts. */
export function EditorLayout({
  onSignOut,
  children,
}: {
  onSignOut: () => void
  children: ReactNode
}) {
  const { questions } = useEditorData()
  const inReview = questions.filter((q) => q.status === 'review').length
  const openReports = questions.reduce((sum, q) => sum + q.open_reports, 0)
  const links = [
    { to: EDITOR_ROUTES.questions, label: t('editor.nav.questions'), count: questions.length },
    { to: EDITOR_ROUTES.review, label: t('editor.nav.review'), count: inReview },
    { to: EDITOR_ROUTES.reports, label: t('editor.nav.reports'), count: openReports },
    { to: EDITOR_ROUTES.games, label: t('editor.nav.games'), count: null },
    { to: EDITOR_ROUTES.importExport, label: t('editor.nav.importExport'), count: null },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-border px-4 py-3 sm:px-8">
        <Link to={ROUTES.home} className="shrink-0 rounded-sm" title={t('editor.nav.game')}>
          <Logo variant="header" className="h-10 w-auto" />
        </Link>
        <nav
          aria-label={t('editor.nav.label')}
          className="-mx-1 flex flex-1 gap-1 overflow-x-auto px-1 py-1 max-sm:order-last max-sm:basis-full"
        >
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className="editor-nav-link">
              {link.label}
              {link.count !== null && (
                <span className="ml-1.5 font-terminal text-lg">{link.count}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <ButtonLink variant="ghost" size="sm" to={ROUTES.home} className="max-sm:ml-auto">
          {t('editor.nav.home')}
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={onSignOut}>
          {t('editor.nav.signOut')}
        </Button>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8">
        {children}
      </main>
    </div>
  )
}
