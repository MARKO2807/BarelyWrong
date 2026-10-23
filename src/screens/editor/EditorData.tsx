import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchEditorQuestions,
  fetchReports,
  fetchSimilarPairs,
  type EditorQuestion,
  type Report,
} from '../../data/editorApi'
import { similarById } from '../../data/editorChecks'
import { SIMILARITY, todayInCroatia } from '../../data/import'

interface Loaded {
  questions: EditorQuestion[]
  reports: Report[]
  similar: Map<string, { id: string; similarity: number }[]>
}

interface EditorData extends Loaded {
  db: SupabaseClient
  today: string
  byId: Map<string, EditorQuestion>
  reload: () => Promise<void>
  /** Applies a saved change locally, so screens update without reloading everything. */
  patchQuestion: (id: string, patch: Partial<EditorQuestion>) => void
  patchReport: (id: number, patch: Partial<Report>) => void
}

const EditorDataContext = createContext<EditorData | null>(null)

export function useEditorData(): EditorData {
  const data = use(EditorDataContext)
  if (!data) throw new Error('useEditorData outside EditorDataProvider')
  return data
}

async function load(db: SupabaseClient): Promise<Loaded> {
  const [questions, reports, pairs] = await Promise.all([
    fetchEditorQuestions(db),
    fetchReports(db),
    fetchSimilarPairs(db, SIMILARITY.possible),
  ])
  return { questions, reports, similar: similarById(pairs) }
}

type State =
  { status: 'loading' } | { status: 'error'; message: string } | ({ status: 'ready' } & Loaded)

export function EditorDataProvider({
  db,
  children,
  renderStatus,
}: {
  db: SupabaseClient
  children: ReactNode
  /** Shown while loading or after a failed load. */
  renderStatus: (state: { message: string | null; retry: () => void }) => ReactNode
}) {
  const [state, setState] = useState<State>({ status: 'loading' })

  const reload = useCallback(
    () =>
      load(db).then(
        (loaded) => setState({ status: 'ready', ...loaded }),
        (error: unknown) =>
          setState({
            status: 'error',
            // Supabase errors are plain objects with a message, not Error instances.
            message:
              typeof error === 'object' && error && 'message' in error
                ? String(error.message)
                : String(error),
          }),
      ),
    [db],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  const patchQuestion = useCallback((id: string, patch: Partial<EditorQuestion>) => {
    setState((s) =>
      s.status === 'ready'
        ? { ...s, questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }
        : s,
    )
  }, [])

  const patchReport = useCallback((id: number, patch: Partial<Report>) => {
    setState((s) => {
      if (s.status !== 'ready') return s
      const reports = s.reports.map((r) => (r.id === id ? { ...r, ...patch } : r))
      const open = new Map<string, number>()
      for (const r of reports)
        if (!r.resolved) open.set(r.question_id, (open.get(r.question_id) ?? 0) + 1)
      const questions = s.questions.map((q) => ({ ...q, open_reports: open.get(q.id) ?? 0 }))
      return { ...s, reports, questions }
    })
  }, [])

  const value = useMemo((): EditorData | null => {
    if (state.status !== 'ready') return null
    return {
      db,
      today: todayInCroatia(),
      questions: state.questions,
      reports: state.reports,
      similar: state.similar,
      byId: new Map(state.questions.map((q) => [q.id, q])),
      reload,
      patchQuestion,
      patchReport,
    }
  }, [state, db, reload, patchQuestion, patchReport])

  if (!value) {
    return renderStatus({
      message: state.status === 'error' ? state.message : null,
      retry: () => {
        setState({ status: 'loading' })
        void reload()
      },
    })
  }
  return <EditorDataContext value={value}>{children}</EditorDataContext>
}
