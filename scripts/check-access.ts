// Checks the database rules the way a player sees them (anon key only). Run: npm run db:check
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local first.')
  process.exit(1)
}
const db = createClient(new URL(url).origin, key, { auth: { persistSession: false } })

type Result = { error: { code?: string; message: string } | null; data?: unknown[] | null }

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures++
}
const describe = (r: Result) => (r.error ? `${r.error.code}: ${r.error.message}` : 'no error')

/** Allowed: no error. */
function allowed(name: string, r: Result) {
  check(name, !r.error, r.error ? describe(r) : '')
}
/** Refused for the expected reason (an unrelated error such as a bad URL must not count). */
function refused(name: string, r: Result, codes: readonly string[]) {
  check(name, Boolean(r.error?.code && codes.includes(r.error.code)), describe(r))
}

const PERMISSION = ['42501']
const CONSTRAINT = ['23514']

// A question that exists (pilot) to attach test rows to.
const questionId = 'sport-0001'

const view = await db.from('game_questions').select('id')
allowed('players can read game_questions', view)
console.log(`     game_questions currently shows ${view.data?.length ?? 0} approved question(s)`)

// Selecting a column the view doesn't have fails with "column does not exist".
refused(
  'game_questions hides editor_note',
  await db.from('game_questions').select('editor_note').limit(1),
  ['42703'],
)

for (const table of ['questions', 'question_texts', 'answer_events', 'question_reports', 'topics'])
  refused(`players cannot read ${table}`, await db.from(table).select('*').limit(1), PERMISSION)

allowed(
  'players can add statistics',
  await db.from('answer_events').insert({ question_id: questionId, kind: 'turn', correct: true }),
)
refused(
  'statistics reject unknown kinds',
  await db.from('answer_events').insert({ question_id: questionId, kind: 'cheat', correct: true }),
  CONSTRAINT,
)
refused(
  'statistics reject unknown questions',
  await db.from('answer_events').insert({ question_id: 'sport-9999', kind: 'turn', correct: true }),
  ['23503'],
)

allowed(
  'players can report questions',
  await db.from('question_reports').insert({
    question_id: questionId,
    reason: 'other',
    comment: 'Provjera pristupa (npm run db:check)',
  }),
)
refused(
  'players cannot mark reports resolved',
  await db
    .from('question_reports')
    .insert({ question_id: questionId, reason: 'other', comment: 'test', resolved: true }),
  PERMISSION,
)
refused(
  'report comments are capped at 500 characters',
  await db
    .from('question_reports')
    .insert({ question_id: questionId, reason: 'other', comment: 'x'.repeat(501) }),
  CONSTRAINT,
)

refused(
  'players cannot change questions',
  await db.from('questions').update({ status: 'approved' }).eq('id', questionId),
  PERMISSION,
)
refused(
  'players cannot delete statistics',
  await db.from('answer_events').delete().eq('question_id', questionId),
  PERMISSION,
)

// The editor's tools (migration _editor.sql).
refused(
  'players cannot read editor_questions',
  await db.from('editor_questions').select('id').limit(1),
  PERMISSION,
)
refused(
  'players cannot import questions',
  await db.rpc('import_questions', { items: [] }),
  PERMISSION,
)
refused(
  'players cannot search similar questions',
  await db.rpc('similar_pairs', { min_similarity: 0.9 }),
  PERMISSION,
)

// The editor's side, when the scripts can sign in (BW_EDITOR_EMAIL / BW_EDITOR_PASSWORD).
if (process.env.BW_EDITOR_EMAIL && process.env.BW_EDITOR_PASSWORD) {
  const editor = createClient(new URL(url).origin, key, { auth: { persistSession: false } })
  const signIn = await editor.auth.signInWithPassword({
    email: process.env.BW_EDITOR_EMAIL,
    password: process.env.BW_EDITOR_PASSWORD,
  })
  check('editor can sign in', !signIn.error, signIn.error?.message)
  const role = signIn.data.user?.app_metadata.role
  check(
    'editor account has the editor role',
    role === 'editor',
    role === 'editor' ? '' : 'app_metadata.role is not "editor"',
  )
  const list = await editor.from('editor_questions').select('id', { count: 'exact', head: true })
  check('editor reads editor_questions', !list.error && (list.count ?? 0) > 0, describe(list))
  allowed(
    'editor can call the import (empty batch)',
    await editor.rpc('import_questions', { items: [] }),
  )
  allowed(
    'editor can search similar questions',
    await editor.rpc('similar_pairs', { min_similarity: 0.99 }),
  )
  refused(
    'not even the editor can delete questions',
    await editor.from('questions').delete().eq('id', 'sport-9999'),
    PERMISSION,
  )
} else {
  console.log('\n(Editor checks skipped: BW_EDITOR_EMAIL / BW_EDITOR_PASSWORD not set.)')
}

console.log(failures === 0 ? '\nAll access rules hold.' : `\n${failures} check(s) failed.`)
console.log(
  'Note: each run adds one test statistic and one test report; delete them in the editor.',
)
process.exit(failures === 0 ? 0 : 1)
