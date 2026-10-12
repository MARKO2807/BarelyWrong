import { useId, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EDITOR_ROUTES } from '../../app/routes'
import { QUESTION_STATUSES } from '../../data/batchSchema'
import { correctRate } from '../../data/editorChecks'
import { matchKey } from '../../data/import'
import { QUESTION_FORMATS, TOPICS } from '../../engine'
import { t, tList } from '../../i18n'
import { Checkbox, Select, TextInput } from '../../ui/editor/fields'
import { StatusBadge } from '../../ui/editor/StatusBadge'
import { useEditorData } from './EditorData'

const ALL = 'all'

/** Every question, filtered (spec 9.3). Filters live in the URL, so Back keeps them. */
export function QuestionsPage() {
  const { questions, similar } = useEditorData()
  const [params, setParams] = useSearchParams()
  const headingId = useId()

  const filters = {
    text: params.get('q') ?? '',
    status: params.get('status') ?? ALL,
    topic: params.get('topic') ?? ALL,
    format: params.get('format') ?? ALL,
    difficulty: params.get('difficulty') ?? ALL,
    reports: params.get('reports') === '1',
    similar: params.get('similar') === '1',
  }
  const setFilter = (name: string, value: string | boolean) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === ALL || value === '' || value === false) next.delete(name)
        else next.set(name, value === true ? '1' : value)
        return next
      },
      { replace: true },
    )

  const searchable = useMemo(
    () =>
      new Map(
        questions.map((q) => [
          q.id,
          matchKey([q.id, q.question, q.answer, ...q.accept, ...q.tags, q.note ?? ''].join(' ')),
        ]),
      ),
    [questions],
  )

  const query = matchKey(filters.text)
  const shown = questions.filter(
    (q) =>
      (filters.status === ALL || q.status === filters.status) &&
      (filters.topic === ALL || q.topic === filters.topic) &&
      (filters.format === ALL || q.format === filters.format) &&
      (filters.difficulty === ALL || String(q.difficulty) === filters.difficulty) &&
      (!filters.reports || q.open_reports > 0) &&
      (!filters.similar || similar.has(q.id)) &&
      (!query || searchable.get(q.id)!.includes(query)),
  )

  const all = { value: ALL, label: t('editor.all') }
  const difficulties = tList('editor.difficulties')

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h1 id={headingId} className="font-display text-4xl font-extrabold">
        {t('editor.nav.questions')}
      </h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <TextInput
          label={t('editor.list.search')}
          type="search"
          placeholder={t('editor.list.searchPlaceholder')}
          value={filters.text}
          onChange={(event) => setFilter('q', event.target.value)}
          className="col-span-2"
        />
        <Select
          label={t('editor.fields.status')}
          value={filters.status}
          options={[
            all,
            ...QUESTION_STATUSES.map((s) => ({ value: s, label: t(`editor.statuses.${s}`) })),
          ]}
          onChange={(value) => setFilter('status', value)}
        />
        <Select
          label={t('editor.fields.topic')}
          value={filters.topic}
          options={[all, ...TOPICS.map((topic) => ({ value: topic, label: t(`topics.${topic}`) }))]}
          onChange={(value) => setFilter('topic', value)}
        />
        <Select
          label={t('editor.fields.format')}
          value={filters.format}
          options={[
            all,
            ...QUESTION_FORMATS.map((f) => ({ value: f, label: t(`editor.formats.${f}`) })),
          ]}
          onChange={(value) => setFilter('format', value)}
        />
        <Select
          label={t('editor.fields.difficulty')}
          value={filters.difficulty}
          options={[all, ...difficulties.map((label, i) => ({ value: String(i + 1), label }))]}
          onChange={(value) => setFilter('difficulty', value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Checkbox
          label={t('editor.list.withReports')}
          checked={filters.reports}
          onChange={(checked) => setFilter('reports', checked)}
        />
        <Checkbox
          label={t('editor.list.withSimilar')}
          checked={filters.similar}
          onChange={(checked) => setFilter('similar', checked)}
        />
        <p role="status" className="ml-auto text-text-muted">
          {t('editor.list.count', { count: shown.length, total: questions.length })}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="text-lg text-text-muted">{t('editor.list.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border-2 border-border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface font-display text-sm font-extrabold">
              <tr>
                <th scope="col" className="px-3 py-2 max-md:hidden">
                  {t('editor.fields.id')}
                </th>
                <th scope="col" className="w-full px-3 py-2">
                  {t('editor.fields.question')}
                </th>
                <th scope="col" className="px-3 py-2 max-lg:hidden">
                  {t('editor.fields.topic')}
                </th>
                <th scope="col" className="px-3 py-2 max-sm:hidden">
                  {t('editor.fields.status')}
                </th>
                <th scope="col" className="px-3 py-2 text-right max-md:hidden">
                  {t('editor.fields.stats')}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((q) => {
                const similarIds = similar.get(q.id)?.map((s) => s.id) ?? []
                return (
                  <tr key={q.id} className="border-t-2 border-border align-top hover:bg-surface">
                    <td className="px-3 py-2 font-terminal text-lg whitespace-nowrap max-md:hidden">
                      {q.id}
                    </td>
                    <td className="min-w-64 px-3 py-2 break-words">
                      <Link
                        to={EDITOR_ROUTES.question(q.id)}
                        className="block rounded-sm font-semibold hover:text-primary-text"
                      >
                        {q.question}
                      </Link>
                      <p className="text-text-muted">{q.answer}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-text-muted">
                        <span className="font-terminal text-base md:hidden">{q.id}</span>
                        <span className="sm:hidden">
                          <StatusBadge status={q.status} />
                        </span>
                        <span>
                          {t(`editor.formats.${q.format}`)} · {difficulties[q.difficulty - 1]}
                        </span>
                        {q.open_reports > 0 && (
                          <span className="font-semibold text-wrong">
                            {t('editor.list.reports', { count: q.open_reports })}
                          </span>
                        )}
                        {similarIds.length > 0 && (
                          <span className="font-semibold text-primary-text">
                            {t('editor.list.similar', { ids: similarIds.join(', ') })}
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap max-lg:hidden">
                      {t(`topics.${q.topic}`)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap max-sm:hidden">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-3 py-2 text-right font-terminal text-lg whitespace-nowrap max-md:hidden">
                      {q.shown === 0
                        ? '—'
                        : t('editor.list.stats', {
                            shown: q.shown,
                            rate: correctRate(q.shown, q.correct),
                          })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
