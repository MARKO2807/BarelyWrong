import { useId, useState } from 'react'
import { t } from '../../i18n'
import { SegmentedControl } from '../../ui/SegmentedControl'
import { useEditorData } from './EditorData'
import { ReportItem } from './parts'

type Filter = 'open' | 'all'

/** Reports sent from the game (spec 4.9, 9.3), newest first. */
export function ReportsPage() {
  const { reports } = useEditorData()
  const [filter, setFilter] = useState<Filter>('open')
  const headingId = useId()
  const shown = filter === 'open' ? reports.filter((r) => !r.resolved) : reports

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id={headingId} className="font-display text-4xl font-extrabold">
          {t('editor.reports.title')}
        </h1>
        <SegmentedControl
          name="reports"
          labelledBy={headingId}
          value={filter}
          options={[
            { value: 'open', label: t('editor.reports.open') },
            { value: 'all', label: t('editor.reports.all') },
          ]}
          onChange={setFilter}
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-xl text-text-muted">{t('editor.reports.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((report) => (
            <ReportItem key={report.id} report={report} showQuestion />
          ))}
        </ul>
      )}
    </section>
  )
}
