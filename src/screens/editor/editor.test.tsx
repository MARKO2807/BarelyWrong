// @vitest-environment jsdom
import type { SupabaseClient } from '@supabase/supabase-js'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { EditorQuestion } from '../../data/editorApi'
import { EditorDataProvider } from './EditorData'
import { QuestionPage } from './QuestionPage'
import { QuestionsPage } from './QuestionsPage'
import { ReviewPage } from './ReviewPage'

// The editor screens against a fake database that records every write.

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function question(id: string, overrides: Partial<EditorQuestion> = {}): EditorQuestion {
  return {
    id,
    topic: 'geography',
    format: 'open',
    difficulty: 1,
    status: 'review',
    origin: 'own',
    source: 'Wikipedia (hr)',
    tags: [],
    time_sensitive: false,
    checked_at: '2026-10-01',
    editor_note: null,
    has_embedding: true,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    question: `Pitanje ${id}?`,
    answer: `Odgovor ${id}`,
    accept: [],
    note: 'Zanimljivost.',
    shown: 0,
    correct: 0,
    open_reports: 0,
    ...overrides,
  }
}

interface Write {
  table: string
  values: Record<string, unknown>
  filters: [string, unknown][]
}

function fakeDb(questions: EditorQuestion[]) {
  const writes: Write[] = []
  const from = (table: string) => {
    const write: Write = { table, values: {}, filters: [] }
    const chain = {
      select: () => chain,
      order: () => chain,
      range: (start: number, end: number) =>
        Promise.resolve({
          data: table === 'editor_questions' ? questions.slice(start, end + 1) : [],
          error: null,
        }),
      update: (values: Record<string, unknown>) => {
        write.values = values
        writes.push(write)
        return chain
      },
      eq: (column: string, value: unknown) => {
        write.filters.push([column, value])
        return chain
      },
      then: (resolve: (result: { error: null }) => void) => resolve({ error: null }),
    }
    return chain
  }
  const rpc = () => Promise.resolve({ data: [], error: null })
  return { db: { from, rpc } as unknown as SupabaseClient, writes }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(db: SupabaseClient, path: string) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <EditorDataProvider db={db} renderStatus={() => <p>loading</p>}>
            <Outlet />
          </EditorDataProvider>
        ),
        children: [
          { path: '/admin', element: <QuestionsPage /> },
          { path: '/admin/review', element: <ReviewPage /> },
          { path: '/admin/question/:id', element: <QuestionPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  await act(async () => root.render(<RouterProvider router={router} />))
  // Let the data load settle.
  await act(async () => {})
  return router
}

const text = () => container.textContent ?? ''
const press = (key: string) =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  })
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.startsWith(label))!

function setValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = Object.getPrototypeOf(element) as object
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('questions list', () => {
  it('filters by status and text from the URL', async () => {
    const { db } = fakeDb([
      question('geography-0001', { status: 'approved', question: 'Glavni grad Australije?' }),
      question('geography-0002', { question: 'Najduža rijeka Hrvatske?' }),
      question('geography-0003', { question: 'Najviši vrh Australije?' }),
    ])
    await render(db, '/admin?status=review&q=australij')
    expect(text()).toContain('1 od 3 pitanja')
    expect(text()).toContain('Najviši vrh Australije?')
    expect(text()).not.toContain('Glavni grad Australije?')
  })
})

describe('review', () => {
  it('approves with O, moves on, and undoes with Z', async () => {
    const { db, writes } = fakeDb([question('geography-0001'), question('geography-0002')])
    await render(db, '/admin/review')
    expect(text()).toContain('Pitanje geography-0001?')
    expect(text()).toContain('1 od 2')

    await press('o')
    expect(writes.at(-1)).toEqual({
      table: 'questions',
      values: { status: 'approved' },
      filters: [['id', 'geography-0001']],
    })
    expect(text()).toContain('Pitanje geography-0002?')
    expect(text()).toContain('1 od 1')

    await press('z')
    expect(writes.at(-1)!.values).toEqual({ status: 'review' })
    expect(text()).toContain('Pitanje geography-0001?')
  })

  it('does not approve a question that fails the checks', async () => {
    const { db, writes } = fakeDb([question('geography-0001', { note: null })])
    await render(db, '/admin/review')
    expect(text()).toContain('Nedostaje zanimljivost')
    await press('o')
    expect(writes).toEqual([])
    await press('x')
    expect(writes.at(-1)!.values).toEqual({ status: 'rejected' })
  })
})

describe('question page', () => {
  it('saves cleaned-up text to both tables', async () => {
    const { db, writes } = fakeDb([question('geography-0001')])
    await render(db, '/admin/question/geography-0001')
    const answer = container.querySelector<HTMLInputElement>('input[required]')!
    await act(async () => setValue(answer, '  "Canberra"  '))
    expect(text()).toContain('Ima nespremljenih promjena.')

    await act(async () => button('Spremi').click())
    const texts = writes.find((w) => w.table === 'question_texts')!
    expect(texts.values).toMatchObject({ answer: '„Canberra”' })
    expect(texts.filters).toEqual([
      ['question_id', 'geography-0001'],
      ['lang', 'hr'],
    ])
    expect(writes.find((w) => w.table === 'questions')!.values).toMatchObject({
      topic_id: 'geography',
      status: 'review',
    })
    expect(text()).toContain('Spremljeno.')
  })

  it('approves from the page when the checks pass', async () => {
    const { db, writes } = fakeDb([question('geography-0001')])
    await render(db, '/admin/question/geography-0001')
    await act(async () => button('Odobri').click())
    expect(writes.find((w) => w.table === 'questions')!.values).toMatchObject({
      status: 'approved',
    })
  })
})
