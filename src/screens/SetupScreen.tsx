import { useId, useState } from 'react'
import { useStartGame } from '../app/useStartGame'
import {
  DEFAULT_GAME_OPTIONS,
  MAX_TEAMS,
  MIN_TEAMS,
  SECONDS_PER_QUESTION_OPTIONS,
  TEAM_COLORS,
  TEAM_NAME_MAX_LENGTH,
  estimatedDurationSeconds,
  validateSetup,
  type GameOptions,
  type GameSetup,
  type SetupProblem,
  type Team,
  type TeamColor,
} from '../engine'
import { t } from '../i18n'
import { loadLastSetup } from '../storage'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { ShortageDialog } from '../ui/game/ShortageDialog'
import { TeamChip, teamStyle } from '../ui/game/team'
import { PageShell } from '../ui/PageShell'
import { CloseIcon } from '../ui/icons'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Toggle } from '../ui/Toggle'
import { useDocumentTitle } from '../ui/useDocumentTitle'

function newTeam(color: TeamColor): Team {
  return { id: crypto.randomUUID(), name: '', color }
}

function initialSetup(): GameSetup {
  return (
    loadLastSetup() ?? {
      teams: [newTeam(TEAM_COLORS[0]), newTeam(TEAM_COLORS[1])],
      options: { ...DEFAULT_GAME_OPTIONS },
    }
  )
}

function problemText(problem: SetupProblem): string {
  return t(`setup.problems.${problem.type}`)
}

export function SetupScreen() {
  useDocumentTitle(t('setup.title'))
  const [setup, setSetup] = useState(initialSetup)
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const { start, status, shortage, restoreAndStart, dismissShortage } = useStartGame()
  const lengthId = useId()
  const timeId = useId()
  const ffId = useId()

  const problems = validateSetup(setup)
  const teamProblem = (team: Team) => {
    const problem = problems.find((p) => 'teamId' in p && p.teamId === team.id)
    if (!problem) return null
    // An empty name only complains once the field was left empty.
    return problem.type === 'nameMissing' && !touched.has(team.id) ? null : problemText(problem)
  }

  const updateTeam = (id: string, patch: Partial<Team>) =>
    setSetup((s) => ({
      ...s,
      teams: s.teams.map((team) => (team.id === id ? { ...team, ...patch } : team)),
    }))
  const updateOptions = (patch: Partial<GameOptions>) =>
    setSetup((s) => ({ ...s, options: { ...s.options, ...patch } }))
  const addTeam = () =>
    setSetup((s) => {
      const usedColors = new Set(s.teams.map((team) => team.color))
      const color = TEAM_COLORS.find((c) => !usedColors.has(c)) ?? TEAM_COLORS[0]
      return { ...s, teams: [...s.teams, newTeam(color)] }
    })
  const removeTeam = (id: string) =>
    setSetup((s) => ({ ...s, teams: s.teams.filter((team) => team.id !== id) }))

  const minutes = Math.round(estimatedDurationSeconds(setup.teams.length, setup.options) / 60)
  const loading = status === 'loading'

  return (
    <PageShell>
      <form
        className="flex w-full max-w-6xl flex-col gap-6 text-left"
        onSubmit={(event) => {
          event.preventDefault()
          if (problems.length === 0) void start(setup)
          else setTouched(new Set(setup.teams.map((team) => team.id)))
        }}
      >
        <h1 className="text-center font-display text-4xl font-extrabold">{t('setup.title')}</h1>

        <fieldset className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <legend className="mb-3 font-display text-2xl font-extrabold">{t('setup.teams')}</legend>
          {setup.teams.map((team, index) => (
            <TeamRow
              key={team.id}
              team={team}
              number={index + 1}
              takenColors={setup.teams
                .filter((other) => other.id !== team.id)
                .map((other) => other.color)}
              problem={teamProblem(team)}
              canRemove={setup.teams.length > MIN_TEAMS}
              onChange={(patch) => updateTeam(team.id, patch)}
              onBlur={() => setTouched((set) => new Set(set).add(team.id))}
              onRemove={() => removeTeam(team.id)}
            />
          ))}
          {setup.teams.length < MAX_TEAMS && (
            <Button
              variant="secondary"
              onClick={addTeam}
              className="self-center justify-self-start"
            >
              + {t('setup.addTeam')}
            </Button>
          )}
        </fieldset>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_auto_1fr]">
          <div className="flex flex-col gap-2">
            <span id={lengthId} className="font-display text-2xl font-extrabold">
              {t('setup.length')}
            </span>
            <SegmentedControl
              name="length"
              labelledBy={lengthId}
              value={setup.options.length}
              options={[
                { value: 'full', label: t('setup.full') },
                { value: 'short', label: t('setup.short') },
              ]}
              onChange={(length) => updateOptions({ length })}
            />
          </div>
          <div className="flex flex-col gap-2 lg:order-3">
            <span id={ffId} className="font-display text-2xl font-extrabold">
              {t('setup.fastestFinger')}
            </span>
            <Toggle
              checked={setup.options.fastestFinger}
              onChange={(fastestFinger) => updateOptions({ fastestFinger })}
              labelledBy={ffId}
              onLabel={t('setup.on')}
              offLabel={t('setup.off')}
            />
            <p className="text-text-muted">{t('setup.fastestFingerHint')}</p>
          </div>
          <div className="flex flex-col gap-2 lg:order-2">
            <span id={timeId} className="font-display text-2xl font-extrabold">
              {t('setup.time')}
            </span>
            <SegmentedControl
              name="time"
              labelledBy={timeId}
              value={String(setup.options.secondsPerQuestion)}
              options={SECONDS_PER_QUESTION_OPTIONS.map((seconds) => ({
                value: String(seconds),
                label: t('setup.seconds', { count: seconds }),
              }))}
              onChange={(value) =>
                updateOptions({
                  secondsPerQuestion: Number(value) as GameOptions['secondsPerQuestion'],
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-xl text-text-muted">{t('setup.duration', { minutes })}</p>
          <Button type="submit" size="header" disabled={problems.length > 0 || loading}>
            {loading ? t('setup.starting') : t('setup.start')}
          </Button>
          {status === 'failed' && (
            <p role="alert" className="font-semibold text-wrong">
              {t('setup.loadFailed')}
            </p>
          )}
        </div>
      </form>
      <ShortageDialog
        shortage={shortage}
        busy={loading}
        onRestore={restoreAndStart}
        onClose={dismissShortage}
      />
    </PageShell>
  )
}

interface TeamRowProps {
  team: Team
  number: number
  takenColors: readonly TeamColor[]
  problem: string | null
  canRemove: boolean
  onChange: (patch: Partial<Team>) => void
  onBlur: () => void
  onRemove: () => void
}

function TeamRow({
  team,
  number,
  takenColors,
  problem,
  canRemove,
  onChange,
  onBlur,
  onRemove,
}: TeamRowProps) {
  const inputId = useId()
  const errorId = useId()
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border-2 border-border bg-surface p-4"
      style={teamStyle(team.color)}
    >
      <div className="flex items-center gap-3">
        <TeamChip color={team.color} name={team.name} className="size-12 text-3xl max-sm:hidden" />
        <label htmlFor={inputId} className="sr-only">
          {t('setup.teamNumber', { number })}
        </label>
        <input
          id={inputId}
          value={team.name}
          maxLength={TEAM_NAME_MAX_LENGTH}
          placeholder={t('setup.namePlaceholder', { number })}
          autoComplete="off"
          aria-invalid={problem !== null}
          aria-describedby={problem ? errorId : undefined}
          onChange={(event) => onChange({ name: event.target.value })}
          onBlur={onBlur}
          className="min-w-0 flex-1 rounded-md border-2 border-border bg-bg px-4 py-2 text-2xl font-semibold placeholder:text-text-muted"
        />
        <span
          className="w-12 shrink-0 text-right font-terminal text-xl text-text-muted sm:w-14 sm:text-2xl"
          aria-hidden="true"
        >
          {t('setup.nameCounter', { count: [...team.name].length, max: TEAM_NAME_MAX_LENGTH })}
        </span>
        {canRemove && (
          <IconButton
            label={t('setup.removeTeam', { number })}
            onClick={onRemove}
            className="text-base"
          >
            <CloseIcon />
          </IconButton>
        )}
      </div>
      {problem && (
        <p id={errorId} className="font-semibold text-wrong">
          {problem}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={t('setup.colors', { number })}
        className="grid w-fit grid-cols-5 gap-2 xl:grid-cols-10"
      >
        {TEAM_COLORS.map((color) => {
          const taken = takenColors.includes(color)
          return (
            <label
              key={color}
              title={t(`teamColors.${color}`)}
              className={`has-focus-ring rounded-md p-0.5 ${taken ? 'opacity-25' : 'cursor-pointer'} ${
                team.color === color ? 'ring-3 ring-text' : ''
              }`}
            >
              <input
                type="radio"
                name={`color-${team.id}`}
                value={color}
                checked={team.color === color}
                disabled={taken}
                onChange={() => onChange({ color })}
                className="sr-only"
              />
              <span className="sr-only">{t(`teamColors.${color}`)}</span>
              <TeamChip color={color} name={team.name} className="size-11 text-2xl" />
            </label>
          )
        })}
      </div>
    </div>
  )
}
