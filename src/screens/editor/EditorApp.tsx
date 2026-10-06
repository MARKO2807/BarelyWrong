import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { editorDb, isEditor } from '../../data/editorSession'
import { t } from '../../i18n'
import { Button } from '../../ui/Button'
import { TextInput } from '../../ui/editor/fields'
import { useDocumentTitle } from '../../ui/useDocumentTitle'
import { EditorDataProvider } from './EditorData'
import { EditorLayout, EditorRoutes } from './EditorLayout'

/** /urednik (spec 9.3): loaded on its own, so the game never downloads it. */
export function EditorApp() {
  useDocumentTitle(t('editor.title'))
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      {editorDb ? <AuthGate db={editorDb} /> : <Notice>{t('editor.notConfigured')}</Notice>}
    </>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg px-4 text-center text-xl">
      {children}
    </main>
  )
}

function AuthGate({ db }: { db: SupabaseClient }) {
  // undefined until Supabase has read the stored sign-in.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    const { data } = db.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [db])

  if (session === undefined) return <Notice>{t('editor.loading')}</Notice>
  if (!session) return <LoginForm db={db} />
  if (!isEditor(session.user.app_metadata)) {
    return (
      <Notice>
        <p className="max-w-xl text-balance">{t('editor.login.notEditor')}</p>
        <Button variant="secondary" onClick={() => void db.auth.signOut()}>
          {t('editor.nav.signOut')}
        </Button>
      </Notice>
    )
  }
  return (
    <EditorDataProvider
      db={db}
      renderStatus={({ message, retry }) => (
        <Notice>
          {message === null ? (
            t('editor.loading')
          ) : (
            <>
              <p className="max-w-xl text-wrong">{t('editor.loadFailed', { message })}</p>
              <Button onClick={retry}>{t('editor.retry')}</Button>
            </>
          )}
        </Notice>
      )}
    >
      <EditorLayout onSignOut={() => void db.auth.signOut()}>
        <EditorRoutes />
      </EditorLayout>
    </EditorDataProvider>
  )
}

function LoginForm({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <Notice>
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border-2 border-border bg-surface p-6 text-left text-lg"
        onSubmit={(event) => {
          event.preventDefault()
          setBusy(true)
          setFailed(false)
          void db.auth.signInWithPassword({ email, password }).then(({ error }) => {
            setBusy(false)
            setFailed(Boolean(error))
          })
        }}
      >
        <h1 className="font-display text-3xl font-extrabold">{t('editor.login.title')}</h1>
        <TextInput
          label={t('editor.login.email')}
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextInput
          label={t('editor.login.password')}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {failed && (
          <p role="alert" className="text-wrong">
            {t('editor.login.failed')}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? t('editor.login.submitting') : t('editor.login.submit')}
        </Button>
      </form>
    </Notice>
  )
}
