// Backs up the whole database (questions with texts, reports, statistics) as JSON:
//   npm run export  →  backups/barely-wrong-<date>.json (not in git)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exportDatabase } from '../src/data/editorApi.ts'
import { todayInCroatia } from '../src/data/import/index.ts'
import { editorClient } from './lib/editor.ts'

const db = await editorClient()
const backup = await exportDatabase(db)
const dir = join(import.meta.dirname, '..', 'backups')
mkdirSync(dir, { recursive: true })
const file = join(dir, `barely-wrong-${todayInCroatia()}.json`)
writeFileSync(file, JSON.stringify(backup, null, 2) + '\n')
console.log(
  `${backup.questions.length} questions, ${backup.reports.length} reports and ` +
    `${backup.answerEvents.length} answers → ${file}`,
)
