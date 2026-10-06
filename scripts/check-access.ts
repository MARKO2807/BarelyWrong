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

console.log(failures === 0 ? '\nAll access rules hold.' : `\n${failures} check(s) failed.`)
console.log(
  'Note: each run adds one test statistic and one test report; delete them in the editor.',
)
process.exit(failures === 0 ? 0 : 1)
