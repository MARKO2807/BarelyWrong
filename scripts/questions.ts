// Tools for writing question batches (skill serija-pitanja). Run: npm run q -- <command> ...
//
//   find "Odgovor" ...             does the answer exist already, or is it mentioned elsewhere?
//   search "regex" ...             questions whose text, answer or note match (any status)
//   show <id> ...                  full text of questions by id
//   wiki <lang:Title> ["regex" ...] where a phrase appears in a Wikipedia article (cached)
//   check <draft>                  fact check: every needle must appear in its Wikipedia article
//   review <draft> <topic> <format>  build the batch, dry-run the import, drop items with errors
//   import <draft> <topic> <format> [--force]  check, build, dry-run and import into the database
//   set <id> note|source "text"    change one field in the database and in the batch file
//   archive "reason" <id> ...      archive questions (database and batch files)
//   count                          approved questions by format and difficulty
//
// A draft is content/drafts/<name>.json (not committed), a list of
//   [difficulty, question, answer, accept[], note, page, tags[], needles[], extra?]
// page is 'en:Title' or 'hr:Title' and becomes the source; needles are short phrases that must
// appear in that article (they prove the question and the note); extra is { topic } for
// true_false and estimate batches, whose questions come from several topics. The batch is
// content/batches/<name>.json, so the draft name is the batch name (e.g. sport-23).
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, resolveConfig } from 'prettier'
import { editorClient } from './lib/editor.ts'

const ROOT = join(import.meta.dirname, '..')
const BATCHES = join(ROOT, 'content', 'batches')
const DRAFTS = join(ROOT, 'content', 'drafts')
const WIKI_CACHE = join(ROOT, '.cache', 'wiki')
const USER_AGENT = 'BarelyWrongFactCheck/1.0 (https://barelywrong.com)'
/** Words that make a note go stale; the import flags them too (Sadrži „…”). */
const STALE_WORDS = /\b(danas|trenutno|zadnji|zadnja|zadnje)\b/i

type Format = 'open' | 'true_false' | 'estimate'
interface BatchQuestion {
  id?: string
  topic: string
  format: Format
  difficulty: number
  question: string
  answer: string
  accept?: string[]
  note?: string | null
  source?: string
  tags?: string[]
  status?: string
  editorNote?: string
  checkedAt?: string
}
type DraftItem = [
  difficulty: number,
  question: string,
  answer: string,
  accept: string[],
  note: string,
  page: string,
  tags: string[],
  needles: string[],
  extra?: { topic?: string },
]

// ---------- files ----------

function batchFiles(): string[] {
  return readdirSync(BATCHES).filter((f) => f.endsWith('.json'))
}

function readBatch(file: string): BatchQuestion[] {
  return JSON.parse(readFileSync(join(BATCHES, file), 'utf8')) as BatchQuestion[]
}

function allQuestions(): BatchQuestion[] {
  return batchFiles().flatMap(readBatch)
}

async function writeBatch(file: string, items: BatchQuestion[]) {
  const path = join(BATCHES, file)
  const options = (await resolveConfig(path)) ?? {}
  writeFileSync(path, await format(JSON.stringify(items), { ...options, parser: 'json' }))
}

function readDraft(name: string): DraftItem[] {
  return JSON.parse(readFileSync(join(DRAFTS, `${name}.json`), 'utf8')) as DraftItem[]
}

function writeDraft(name: string, items: DraftItem[]) {
  mkdirSync(DRAFTS, { recursive: true })
  const lines = items.map((item) => JSON.stringify(item))
  writeFileSync(join(DRAFTS, `${name}.json`), `[\n${lines.join(',\n')}\n]\n`)
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const short = (q: BatchQuestion) =>
  `${q.id ?? '-'} ${q.status ?? '?'} d${q.difficulty} | ${q.question} | ${q.answer}`

// ---------- Wikipedia ----------

async function article(page: string): Promise<string> {
  const [lang, ...rest] = page.split(':')
  const title = rest.join(':')
  mkdirSync(WIKI_CACHE, { recursive: true })
  const file = join(WIKI_CACHE, `${lang}_${title.replace(/[^\p{L}\p{N}]+/gu, '_')}.txt`)
  if (existsSync(file)) return readFileSync(file, 'utf8')
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1` +
    `&redirects=1&format=json&titles=${encodeURIComponent(title)}`
  const json = (await (await fetch(url, { headers: { 'User-Agent': USER_AGENT } })).json()) as {
    query: { pages: Record<string, { title: string; extract?: string; missing?: string }> }
  }
  const p = Object.values(json.query.pages)[0]
  const text = !p || p.missing !== undefined ? '' : `${p.title}\n${p.extract ?? ''}`
  writeFileSync(file, text)
  return text
}

const flatten = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')

// ---------- commands ----------

/** Existing answers (any status, also accepted forms) and mentions in approved questions. */
function find(answers: string[]) {
  const byAnswer = new Map<string, BatchQuestion>()
  const texts: [BatchQuestion, string][] = []
  for (const q of allQuestions()) {
    for (const a of [q.answer, ...(q.accept ?? [])])
      if (!byAnswer.has(norm(a))) byAnswer.set(norm(a), q)
    if (q.status === 'approved') texts.push([q, ` ${norm(`${q.question} ${q.note ?? ''}`)} `])
  }
  const free: string[] = []
  for (const answer of answers) {
    const hit = byAnswer.get(norm(answer))
    if (hit) {
      console.log(`HAS  ${answer}  ←  ${short(hit).slice(0, 110)}`)
      continue
    }
    // Stems tolerate Croatian case endings: each word must start a word in the other text.
    const stems = norm(answer)
      .split(' ')
      .filter((w) => w.length > 2)
      .map((w) => ` ${w.length > 5 ? w.slice(0, -2) : w.length > 3 ? w.slice(0, -1) : w}`)
    const mentions =
      stems.length && norm(answer).length > 3
        ? texts.filter(([, text]) => stems.every((stem) => text.includes(stem)))
        : []
    if (mentions.length) {
      const where = mentions.slice(0, 2).map(([q]) => `${q.id}: ${q.question.slice(0, 60)}`)
      console.log(`MENT ${answer}  ←  ${where.join(' / ')}`)
    } else free.push(answer)
  }
  console.log(`free (${free.length}): ${free.join(' · ')}`)
}

function search(patterns: string[]) {
  const all = allQuestions()
  for (const pattern of patterns) {
    const re = new RegExp(pattern, 'i')
    const hits = all.filter((q) =>
      re.test([q.question, q.answer, ...(q.accept ?? []), q.note ?? ''].join(' | ')),
    )
    console.log(`## ${pattern} (${hits.length})`)
    for (const q of hits.slice(0, 8)) console.log(`  ${short(q).slice(0, 140)}`)
  }
}

function show(ids: string[]) {
  const wanted = new Set(ids)
  for (const q of allQuestions())
    if (q.id && wanted.has(q.id)) console.log(`${short(q)} | ${q.note ?? ''}`)
}

async function wiki(page: string, patterns: string[]) {
  const text = (await article(page)).replace(/\s+/g, ' ')
  if (!text) return console.log(`NO PAGE ${page}`)
  if (patterns.length === 0) return console.log(text.slice(0, 1500))
  for (const pattern of patterns) {
    const re = new RegExp(pattern, 'gi')
    let shown = 0
    for (const m of text.matchAll(re)) {
      if (shown++ === 4) break
      console.log(`[${pattern}] …${text.slice(Math.max(0, m.index - 160), m.index + 200)}…\n`)
    }
    if (shown === 0) console.log(`[${pattern}] not found`)
  }
}

/** Fact check of a draft; returns how many items failed. */
async function check(name: string): Promise<number> {
  const items = readDraft(name)
  let failed = 0
  for (const [i, [difficulty, question, answer, , note, page, , needles]] of items.entries()) {
    const label = `${i + 1} ${answer}`
    const problems: string[] = []
    if (difficulty === 1) problems.push('easy')
    if (!note) problems.push('no note')
    if (STALE_WORDS.test(`${question} ${note}`)) problems.push('stale word in question or note')
    const text = flatten(await article(page))
    if (!text) problems.push('page missing')
    else {
      const missing = needles.filter((n) => !text.includes(flatten(n)))
      if (missing.length)
        problems.push(`missing ${missing.map((m) => JSON.stringify(m)).join(', ')}`)
    }
    if (problems.length) {
      failed++
      console.log(`FAIL  ${label}  ${page}  ${problems.join('; ')}`)
    }
  }
  const counts = [2, 3].map((d) => items.filter((item) => item[0] === d).length)
  console.log(`${items.length - failed}/${items.length} confirmed, medium/hard ${counts.join('/')}`)
  return failed
}

/** Writes content/batches/<name>.json from the draft; never over an imported batch. */
function build(name: string, topic: string, questionFormat: Format) {
  const file = `${name}.json`
  if (existsSync(join(BATCHES, file)) && readBatch(file).some((q) => q.id)) {
    throw new Error(`${file} is already imported (it has ids); pick a new name.`)
  }
  const today = new Date().toISOString().slice(0, 10)
  const items: BatchQuestion[] = readDraft(name).map(
    ([difficulty, question, answer, accept, note, page, tags, , extra]) => {
      const [lang, ...title] = page.split(':')
      return {
        topic: extra?.topic ?? topic,
        format: questionFormat,
        difficulty,
        question,
        answer,
        accept,
        note,
        source: `Wikipedia (${lang}): ${title.join(':')}`,
        tags,
        checkedAt: today,
        status: 'approved',
      }
    },
  )
  writeFileSync(join(BATCHES, file), `${JSON.stringify(items, null, 2)}\n`)
}

function dryRun(name: string): string {
  try {
    return execSync(`npm run import -- content/batches/${name}.json --dry-run`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    return `${e.stdout ?? ''}${e.stderr ?? ''}`
  }
}

/** Builds and dry-runs; drops items with errors from the draft and shows the warnings. */
async function review(name: string, topic: string, questionFormat: Format) {
  build(name, topic, questionFormat)
  const out = dryRun(name)
  const blocks = out.split(/\n(?=Pitanje \d+:)/).filter((b) => /^Pitanje \d+:/.test(b))
  const bad = new Set<number>()
  const refs = new Set<string>()
  for (const block of blocks) {
    const n = Number(/^Pitanje (\d+):/.exec(block)?.[1])
    if (/Greška|Sadrži „/.test(block)) {
      bad.add(n)
      continue
    }
    console.log(block.trim())
    for (const m of block.matchAll(/[a-z_]+-\d{4}/g)) refs.add(m[0])
  }
  const items = readDraft(name)
  const dropped = items.filter((_, i) => bad.has(i + 1)).map((item) => item[2])
  writeDraft(
    name,
    items.filter((_, i) => !bad.has(i + 1)),
  )
  console.log(`\ndropped ${dropped.length} (errors): ${dropped.join(' · ')}`)
  console.log(`kept ${items.length - dropped.length}`)
  if (refs.size) {
    console.log('\nReferenced questions:')
    show([...refs])
  }
  if (bad.size) build(name, topic, questionFormat)
}

/** Imports a checked draft; stops on errors, and on likely duplicates unless --force. */
async function importDraft(name: string, topic: string, questionFormat: Format, force: boolean) {
  if ((await check(name)) > 0) throw new Error('Fix the failed checks first.')
  build(name, topic, questionFormat)
  const out = dryRun(name)
  console.log(
    out
      .split('\n')
      .filter((line) => /Pitanje|Greška|Upozorenje|Novih|Točno\/netočno/.test(line))
      .join('\n'),
  )
  if (/Greška|nije moguć|Sadrži „/.test(out)) throw new Error('Blocked: errors in the dry run.')
  if (!force && /Slično pitanju|Isti odgovor u ovoj temi/.test(out)) {
    throw new Error('Review the warnings (npm run q -- review), then import with --force.')
  }
  const result = execSync(`npm run import -- content/batches/${name}.json`, {
    cwd: ROOT,
    encoding: 'utf8',
  })
  console.log(
    result
      .split('\n')
      .filter((line) => /Uvezeno|Imported/.test(line))
      .join('\n'),
  )
  console.log(`Commit content/batches/${name}.json (it now has the ids).`)
}

/** Changes one field of an imported question in the database and in its batch file. */
async function set(id: string, field: string, value: string) {
  if (field !== 'note' && field !== 'source') throw new Error('Field must be note or source.')
  const db = await editorClient()
  const { data, error } =
    field === 'note'
      ? await db
          .from('question_texts')
          .update({ note: value })
          .eq('question_id', id)
          .eq('lang', 'hr')
          .select('question_id')
      : await db.from('questions').update({ source: value }).eq('id', id).select('id')
  if (error || !data?.length) throw new Error(`Database: ${error?.message ?? 'no such question'}`)
  for (const file of batchFiles()) {
    const items = readBatch(file)
    const item = items.find((q) => q.id === id)
    if (!item) continue
    item[field as 'note' | 'source'] = value
    await writeBatch(file, items)
    console.log(`${id}: ${field} updated in the database and in ${file}`)
  }
}

async function archive(reason: string, ids: string[]) {
  const db = await editorClient()
  for (const id of ids) {
    const { error } = await db
      .from('questions')
      .update({ status: 'archived', editor_note: reason })
      .eq('id', id)
    console.log(id, error ? `ERROR ${error.message}` : 'archived in the database')
  }
  for (const file of batchFiles()) {
    const items = readBatch(file)
    let changed = false
    for (const item of items)
      if (item.id && ids.includes(item.id)) {
        item.status = 'archived'
        item.editorNote = reason
        changed = true
      }
    if (changed) await writeBatch(file, items)
  }
}

async function count() {
  const db = await editorClient()
  const counts: Record<string, number> = {}
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('questions')
      .select('format, difficulty')
      .eq('status', 'approved')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const q of data) {
      counts[q.format] = (counts[q.format] ?? 0) + 1
      counts[`difficulty ${q.difficulty}`] = (counts[`difficulty ${q.difficulty}`] ?? 0) + 1
    }
    if (data.length < 1000) break
  }
  const total = Object.entries(counts)
    .filter(([key]) => !key.startsWith('difficulty'))
    .reduce((sum, [, n]) => sum + n, 0)
  console.log({ approved: total, ...counts })
}

// ---------- main ----------

const [command, ...args] = process.argv.slice(2)
const formatArg = (value: string | undefined): Format => {
  if (value === 'open' || value === 'true_false' || value === 'estimate') return value
  throw new Error('Format must be open, true_false or estimate.')
}
const need = (n: number) => {
  if (args.length < n) throw new Error(`Usage: see the top of scripts/questions.ts`)
}

try {
  switch (command) {
    case 'find':
      find(args)
      break
    case 'search':
      search(args)
      break
    case 'show':
      show(args)
      break
    case 'wiki':
      need(1)
      await wiki(args[0]!, args.slice(1))
      break
    case 'check':
      need(1)
      process.exitCode = (await check(args[0]!)) > 0 ? 1 : 0
      break
    case 'review':
      need(3)
      await review(args[0]!, args[1]!, formatArg(args[2]))
      break
    case 'import':
      need(3)
      await importDraft(args[0]!, args[1]!, formatArg(args[2]), args.includes('--force'))
      break
    case 'set':
      need(3)
      await set(args[0]!, args[1]!, args[2]!)
      break
    case 'archive':
      need(2)
      await archive(args[0]!, args.slice(1))
      break
    case 'count':
      await count()
      break
    default:
      console.log(readFileSync(import.meta.filename, 'utf8').split('\nimport')[0])
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
