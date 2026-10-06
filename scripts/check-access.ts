// Checks the database rules the way a player sees them (anon key only). Run: npm run db:check
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local first.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
  if (!ok) failures++
}

// A question that exists (pilot) to attach test rows to.
const questionId = 'sport-0001'

const view = await db.from('game_questions').select('id, status:topic').limit(5)
check('players can read game_questions', !view.error, view.error?.message)

const viewColumns = await db.from('game_questions').select('editor_note').limit(1)
check('game_questions hides editor_note', Boolean(viewColumns.error))

for (const table of [
  'questions',
  'question_texts',
  'answer_events',
  'question_reports',
  'topics',
]) {
  const read = await db.from(table).select('*').limit(1)
  check(
    `players cannot read ${table}`,
    Boolean(read.error) || (read.data?.length ?? 0) === 0,
    read.error?.message,
  )
}

const answer = await db
  .from('answer_events')
  .insert({ question_id: questionId, kind: 'turn', correct: true })
check('players can add statistics', !answer.error, answer.error?.message)

const badAnswer = await db
  .from('answer_events')
  .insert({ question_id: questionId, kind: 'cheat', correct: true })
check('statistics reject unknown kinds', Boolean(badAnswer.error))

const report = await db.from('question_reports').insert({
  question_id: questionId,
  reason: 'other',
  comment: 'Provjera pristupa (npm run db:check)',
})
check('players can report questions', !report.error, report.error?.message)

const resolved = await db
  .from('question_reports')
  .insert({ question_id: questionId, reason: 'other', comment: 'test', resolved: true })
check('players cannot mark reports resolved', Boolean(resolved.error))

const longComment = await db
  .from('question_reports')
  .insert({ question_id: questionId, reason: 'other', comment: 'x'.repeat(501) })
check('report comments are capped at 500 characters', Boolean(longComment.error))

const edit = await db.from('questions').update({ status: 'approved' }).eq('id', questionId).select()
check('players cannot change questions', Boolean(edit.error) || (edit.data?.length ?? 0) === 0)

console.log(failures === 0 ? '\nAll access rules hold.' : `\n${failures} check(s) failed.`)
console.log(
  'Note: the two test rows above (one statistic, one report) can be deleted in the editor.',
)
process.exit(failures === 0 ? 0 : 1)
