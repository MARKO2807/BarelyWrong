import { useId, useState } from 'react'
import { exportDatabase, importRows } from '../../data/editorApi'
import {
  describeFileError,
  hasErrors,
  itemsToInsert,
  prepareImport,
  summarizePlan,
  toImportRow,
  withAssignedIds,
  type ImportPlan,
} from '../../data/import'
import { t } from '../../i18n'
import { Button } from '../../ui/Button'
import { downloadJson } from '../../ui/editor/download'
import { IssueList } from '../../ui/editor/IssueList'
import { useEditorData } from './EditorData'
import { errorMessage, SectionTitle } from './parts'

interface Selected {
  name: string
  data: unknown[]
  plan: ImportPlan
}

/** Import a batch from the browser (same checks as `npm run import`) and download a backup. */
export function ImportExportPage() {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <h1 id={headingId} className="font-display text-4xl font-extrabold">
        {t('editor.nav.importExport')}
      </h1>
      <ImportSection />
      <ExportSection />
    </section>
  )
}

function ImportSection() {
  const { db, questions, today, reload } = useEditorData()
  const [selected, setSelected] = useState<Selected | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ name: string; ids: string[]; file: unknown[] } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  const choose = async (file: File | undefined) => {
    setSelected(null)
    setResult(null)
    setError(null)
    setFileError(null)
    if (!file) return
    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      setFileError(describeFileError('notJson'))
      return
    }
    const plan = prepareImport(data, questions, today)
    if (plan.fileError || !Array.isArray(data))
      setFileError(describeFileError(plan.fileError ?? 'notList'))
    else setSelected({ name: file.name, data, plan })
  }

  const runImport = (current: Selected) => {
    const candidates = itemsToInsert(current.plan)
    setBusy(true)
    setError(null)
    importRows(
      db,
      candidates.map((p) => toImportRow(p.item)),
    ).then(
      async (byRow) => {
        const assigned = new Map(candidates.map((p, row) => [p.index, byRow.get(row)!]))
        setResult({
          name: current.name,
          ids: [...assigned.values()],
          file: withAssignedIds(current.data, assigned),
        })
        setSelected(null)
        setBusy(false)
        await reload()
      },
      (e: unknown) => {
        setBusy(false)
        setError(t('editor.saveFailed', { message: errorMessage(e) }))
      },
    )
  }

  const summary = selected ? summarizePlan(selected.plan) : null
  const blocked = selected ? hasErrors(selected.plan) : true

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>{t('editor.importExport.importTitle')}</SectionTitle>
      <p className="max-w-3xl text-text-muted">{t('editor.importExport.importHint')}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="font-display font-extrabold">
          {t('editor.importExport.chooseFile')}
        </label>
        <input
          id={inputId}
          type="file"
          accept="application/json,.json"
          onChange={(event) => void choose(event.target.files?.[0])}
          className="field-control max-w-xl"
        />
      </div>
      {fileError && <p className="text-wrong">{fileError}</p>}

      {selected && summary && (
        <div className="flex flex-col gap-4">
          <p className="text-lg font-semibold">
            {t('import.summary', {
              insert: summary.insert,
              skip: summary.skip,
              errors: summary.errors,
              warnings: summary.warnings,
            })}
          </p>
          {summary.trueFalse.yes + summary.trueFalse.no > 0 && (
            <p>{t('import.trueFalseBalance', summary.trueFalse)}</p>
          )}
          <ul className="flex flex-col gap-3">
            {selected.plan.items
              .filter((p) => p.issues.length > 0)
              .map((p) => (
                <li key={p.index} className="rounded-lg border-2 border-border bg-surface p-4">
                  <p className="mb-2 font-semibold">
                    {t('import.item', { number: p.index + 1 })}: {p.question}
                  </p>
                  <IssueList issues={p.issues} />
                </li>
              ))}
          </ul>
          {blocked ? (
            <p className="text-wrong">{t('import.blocked')}</p>
          ) : summary.insert === 0 ? (
            <p>{t('import.nothingNew')}</p>
          ) : (
            <Button className="self-start" disabled={busy} onClick={() => runImport(selected)}>
              {busy
                ? t('editor.importExport.importing')
                : t('editor.importExport.import', { count: summary.insert })}
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-wrong">{error}</p>}

      {result && (
        <div role="status" className="flex flex-col items-start gap-3">
          <p className="text-lg font-semibold text-correct">
            {t('import.done', { count: result.ids.length })}
          </p>
          <p className="font-terminal text-lg">{result.ids.join(', ')}</p>
          <Button variant="secondary" onClick={() => downloadJson(result.name, result.file)}>
            {t('editor.importExport.downloadWithIds')}
          </Button>
          <p className="text-text-muted">{t('editor.importExport.downloadHint')}</p>
        </div>
      )}
    </section>
  )
}

function ExportSection() {
  const { db, today } = useEditorData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    setBusy(true)
    setError(null)
    exportDatabase(db).then(
      (backup) => {
        downloadJson(`barely-wrong-${today}.json`, backup)
        setBusy(false)
      },
      (e: unknown) => {
        setBusy(false)
        setError(t('editor.loadFailed', { message: errorMessage(e) }))
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>{t('editor.importExport.exportTitle')}</SectionTitle>
      <p className="max-w-3xl text-text-muted">{t('editor.importExport.exportHint')}</p>
      <Button variant="secondary" className="self-start" disabled={busy} onClick={run}>
        {busy ? t('editor.importExport.exporting') : t('editor.importExport.export')}
      </Button>
      {error && <p className="text-wrong">{error}</p>}
    </section>
  )
}
