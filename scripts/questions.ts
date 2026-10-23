// Tools for writing question batches (skill serija-pitanja). Run: npm run q -- <command> ...
//
//   find "Odgovor" ...             does the answer exist already, or is it mentioned elsewhere?
//   search "regex" ...             questions whose text, answer or note match (any status)
//   show <id> ...                  full text of questions by id
//   wiki <page> ["regex" ...]      where a phrase appears in a source article (cached)
//   he "pojam"                     find Hrvatska enciklopedija articles (their he:slug pages)
//   check <draft>                  fact check: every needle must appear in its article
//   review <draft> <topic> <format>  build the batch, dry-run the import, drop items with errors
//   import <draft> <topic> <format> [--force]  check, build, dry-run and import into the database
//   set <id> note|source "text"    change one field in the database and in the batch file
//   archive "reason" <id> ...      archive questions (database and batch files)
//   count                          approved questions by format and difficulty
//   recheck [batch ...] [--review] fetch the sources again and check the stored needles; with
//                                  --review, failed questions go to status review (database)
//
// A draft is content/drafts/<name>.json (not committed), a list of
//   [difficulty, question, answer, accept[], note, page, tags[], needles[], extra?]
// page is 'en:Title' or 'hr:Title' (Wikipedia) or 'he:slug' (Hrvatska enciklopedija,
// enciklopedija.hr/clanak/slug) and becomes the source; needles are short phrases that must
// appear in that article (they prove the question and the note). extra is
//   { topic?, also?: [[page, needles[]], ...] }
// topic is for true_false and estimate batches, whose questions come from several topics; also
// lists further sources. Risky questions (estimates, hard ones, records, Croatian topics) need a
// second source from another site or language (needsSecondSource). The batch is
// content/batches/<name>.json, so the draft name is the batch name (e.g. sport-23). The import
// keeps the needles in content/checks/<name>.json for recheck.
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { format, resolveConfig } from 'prettier'
import { editorClient } from './lib/editor.ts'

const ROOT = join(import.meta.dirname, '..')
const BATCHES = join(ROOT, 'content', 'batches')
const DRAFTS = join(ROOT, 'content', 'drafts')
const CHECKS = join(ROOT, 'content', 'checks')
const WIKI_CACHE = join(ROOT, '.cache', 'wiki')
const USER_AGENT = 'BarelyWrongFactCheck/1.0 (https://barelywrong.com)'
/** Words that make a note go stale; the import flags them too (Sadrži „…”). */
const STALE_WORDS = /\b(danas|trenutno|zadnji|zadnja|zadnje)\b/i
/** Claims that go out of date or that one article may get wrong: they need a second source. */
const RECORD_WORDS =
  /(najve[ćc]|najvi[šs]|najdu[žz]|najdulj|najmanj|najni[žz]|najkra[ćc]|najstarij|najmla[đd]|najbr[žz]|rekord|\bprv[aeiou]|\bjedin[aeiou])/i
const CROATIAN = /hrvat|zagreb|split|rijek|osijek|dubrov|zadar|istr|dalmac|slavon/i

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
  extra?: { topic?: string; also?: [page: string, needles: string[]][] },
]
interface Evidence {
  id: string
  checkedAt: string
  sources: { page: string; needles: string[] }[]
}

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

// ---------- sources ----------

const cacheFile = (page: string) => {
  const [site, ...rest] = page.split(':')
  return join(WIKI_CACHE, `${site}_${rest.join(':').replace(/[^\p{L}\p{N}]+/gu, '_')}.txt`)
}

/** Text of a source page, its title on the first line; '' when the page does not exist. */
async function article(page: string, fresh = false): Promise<string> {
  const [site, ...rest] = page.split(':')
  const title = rest.join(':')
  mkdirSync(WIKI_CACHE, { recursive: true })
  const file = cacheFile(page)
  if (!fresh && existsSync(file)) return readFileSync(file, 'utf8')
  const text = site === 'he' ? await encyclopedia(title) : await wikipedia(site!, title)
  writeFileSync(file, text)
  return text
}

async function wikipedia(lang: string, title: string): Promise<string> {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1` +
    `&redirects=1&format=json&titles=${encodeURIComponent(title)}`
  let response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  // Too many requests (recheck fetches thousands): wait and try again.
  for (let wait = 5; !response.ok && wait <= 80; wait *= 2) {
    console.error(`Wikipedia ${response.status}, waiting ${wait} s`)
    await new Promise((resolve) => setTimeout(resolve, wait * 1000))
    response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  }
  const json = (await response.json()) as {
    query: { pages: Record<string, { title: string; extract?: string; missing?: string }> }
  }
  const p = Object.values(json.query.pages)[0]
  return !p || p.missing !== undefined ? '' : `${p.title}\n${p.extract ?? ''}`
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  ndash: '–',
  mdash: '—',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  hellip: '…',
  deg: '°',
  middot: '·',
  times: '×',
  shy: '',
  scaron: 'š',
  Scaron: 'Š',
  ccaron: 'č',
  Ccaron: 'Č',
  cacute: 'ć',
  Cacute: 'Ć',
  zcaron: 'ž',
  Zcaron: 'Ž',
  dstrok: 'đ',
  Dstrok: 'Đ',
}
const decode = (html: string) =>
  html.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (!name.startsWith('#')) return ENTITIES[name] ?? whole
    return String.fromCodePoint(Number(name[1] === 'x' ? `0${name.slice(1)}` : name.slice(1)))
  })
const textOf = (html: string) =>
  decode(html.replace(/<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .trim()

/** Hrvatska enciklopedija (enciklopedija.hr); a missing article redirects to the search. */
async function encyclopedia(slug: string): Promise<string> {
  const response = await fetch(`https://www.enciklopedija.hr/clanak/${encodeURIComponent(slug)}`, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'manual',
  })
  if (response.status !== 200) return ''
  const html = await response.text()
  const start = html.indexOf('<div class="clanak">')
  if (start < 0) return ''
  const end = html.indexOf('class="container citiranje"', start)
  const title = /<h1[^>]*>(.*?)<\/h1>/s.exec(html)?.[1] ?? slug
  return `${textOf(title)}\n${textOf(html.slice(start, end < 0 ? undefined : end))}`
}

/** Articles of Hrvatska enciklopedija that match a search, as he:slug pages. */
async function encyclopediaSearch(query: string) {
  const url = `https://www.enciklopedija.hr/Abecedarij?q=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual' })
  // An exact match redirects straight to the article.
  const location = response.headers.get('location')
  if (location?.toLowerCase().startsWith('/clanak/')) {
    return console.log(`he:${location.slice('/clanak/'.length)}  (exact match)`)
  }
  const html = await response.text()
  const hits = [...html.matchAll(/href='\/clanak\/([^']+)'"?>([^<]*)<\/a>/g)].slice(0, 15)
  if (hits.length === 0) console.log('nothing found')
  for (const [, slug, title] of hits) console.log(`he:${slug}  ${textOf(title ?? '')}`)
}

/** The source as written in the batch, e.g. "Wikipedia (en): Rijeka". */
function sourceLabel(page: string): string {
  const [site, ...rest] = page.split(':')
  const title = rest.join(':')
  if (site !== 'he') return `Wikipedia (${site}): ${title}`
  const cached = existsSync(cacheFile(page)) ? readFileSync(cacheFile(page), 'utf8') : ''
  return `Hrvatska enciklopedija: ${cached.split('\n')[0] || title}`
}

const flatten = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')

/** Sources of a draft item: its page and the further ones in extra.also. */
const sourcesOf = (item: DraftItem) => [
  { page: item[5], needles: item[7] },
  ...(item[8]?.also ?? []).map(([page, needles]) => ({ page, needles })),
]

/** Why the item needs a second, independent source ('' when one is enough). */
function needsSecondSource(name: string, item: DraftItem): string {
  const [difficulty, question, answer, , , page] = item
  if (name.startsWith('estimate')) return 'estimate'
  if (difficulty === 3) return 'hard'
  if (RECORD_WORDS.test(question)) return 'record'
  if (/^(hr|he):/.test(page) || CROATIAN.test(`${question} ${answer}`)) return 'Croatian topic'
  return ''
}

/** What is missing from the sources ('page missing' or the needles not found). */
async function missingNeedles(sources: { page: string; needles: string[] }[]) {
  const problems: string[] = []
  for (const { page, needles } of sources) {
    const text = flatten(await article(page))
    if (!text) problems.push(`${page}: page missing`)
    else {
      const missing = needles.filter((n) => !text.includes(flatten(n)))
      if (missing.length)
        problems.push(`${page}: missing ${missing.map((m) => JSON.stringify(m)).join(', ')}`)
    }
  }
  return problems
}

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
  for (const [i, item] of items.entries()) {
    const [difficulty, question, answer, , note] = item
    const problems: string[] = []
    if (difficulty === 1) problems.push('easy')
    if (!note) problems.push('no note')
    if (STALE_WORDS.test(`${question} ${note}`)) problems.push('stale word in question or note')
    const sources = sourcesOf(item)
    problems.push(...(await missingNeedles(sources)))
    // Independent: another site, or Wikipedia in another language.
    const sites = new Set(sources.filter((s) => s.needles.length).map((s) => s.page.split(':')[0]))
    const reason = needsSecondSource(name, item)
    if (reason && sites.size < 2) problems.push(`${reason}: needs a second source (extra.also)`)
    if (problems.length) {
      failed++
      console.log(`FAIL  ${i + 1} ${answer}  ${problems.join('; ')}`)
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
  const items: BatchQuestion[] = readDraft(name).map((item) => {
    const [difficulty, question, answer, accept, note, , tags, , extra] = item
    return {
      topic: extra?.topic ?? topic,
      format: questionFormat,
      difficulty,
      question,
      answer,
      accept,
      note,
      source: sourcesOf(item)
        .map((s) => sourceLabel(s.page))
        .join('; '),
      tags,
      checkedAt: today,
      status: 'approved',
    }
  })
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
  writeEvidence(name)
  console.log(`Commit content/batches/${name}.json and content/checks/${name}.json.`)
}

/** Keeps the needles of an imported draft in content/checks/<name>.json for recheck. */
function writeEvidence(name: string) {
  const batch = readBatch(`${name}.json`)
  const draft = readDraft(name)
  if (batch.length !== draft.length) throw new Error('Batch and draft differ; evidence not kept.')
  const today = new Date().toISOString().slice(0, 10)
  const evidence: Evidence[] = batch.map((q, i) => ({
    id: q.id ?? '',
    checkedAt: today,
    sources: sourcesOf(draft[i]!),
  }))
  mkdirSync(CHECKS, { recursive: true })
  writeFileSync(join(CHECKS, `${name}.json`), `${JSON.stringify(evidence, null, 2)}\n`)
}

/** Fetches the stored sources again; with markReview, failed questions go to status review. */
async function recheck(names: string[], markReview: boolean) {
  const files = names.length
    ? names.map((n) => `${n.replace(/\.json$/, '')}.json`)
    : readdirSync(CHECKS).filter((f) => f.endsWith('.json'))
  const status = new Map(allQuestions().map((q) => [q.id, q.status]))
  const fetched = new Set<string>()
  const failed: { id: string; problems: string[] }[] = []
  let checked = 0
  for (const file of files) {
    const evidence = JSON.parse(readFileSync(join(CHECKS, file), 'utf8')) as Evidence[]
    for (const { id, sources } of evidence) {
      if (status.get(id) !== 'approved') continue
      // Each page is fetched once per run, then read from the refreshed cache.
      const pages = [...new Set(sources.map((s) => s.page))].filter((p) => !fetched.has(p))
      await Promise.all(pages.map((page) => article(page, true)))
      for (const page of pages) fetched.add(page)
      const problems = await missingNeedles(sources)
      checked++
      if (problems.length) {
        failed.push({ id, problems })
        console.log(`FAIL  ${id}  ${problems.join('; ')}`)
      }
    }
  }
  console.log(`\n${checked - failed.length}/${checked} still confirmed (${fetched.size} pages)`)
  if (!markReview || failed.length === 0) return
  const db = await editorClient()
  const today = new Date().toISOString().slice(0, 10)
  for (const { id, problems } of failed) {
    const { error } = await db
      .from('questions')
      .update({
        status: 'review',
        editor_note: `Ponovna provjera ${today}: ${problems.join('; ')}`,
      })
      .eq('id', id)
    console.log(id, error ? `ERROR ${error.message}` : 'status review in the database')
  }
  const ids = new Set(failed.map((f) => f.id))
  for (const file of batchFiles()) {
    const items = readBatch(file)
    if (!items.some((q) => q.id && ids.has(q.id))) continue
    for (const q of items) if (q.id && ids.has(q.id)) q.status = 'review'
    await writeBatch(file, items)
  }
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
    case 'he':
      need(1)
      await encyclopediaSearch(args.join(' '))
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
    case 'recheck':
      await recheck(
        args.filter((a) => a !== '--review'),
        args.includes('--review'),
      )
      break
    default:
      console.log(readFileSync(import.meta.filename, 'utf8').split('\nimport')[0])
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
