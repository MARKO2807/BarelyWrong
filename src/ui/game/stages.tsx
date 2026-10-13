import type { CSSProperties } from 'react'
import {
  getActiveQuestion,
  getCurrentTurn,
  getOutcome,
  getRankingAfterRound,
  getTeam,
  getTimer,
  type GameState,
  type StepType,
} from '../../engine'
import { t } from '../../i18n'
import { FitText } from '../FitText'
import { BoltIcon, KIND_ICONS } from '../icons'
import { AnswerCard, type Verdict } from './AnswerCard'
import { GameTimer } from './GameTimer'
import { Standings } from './Standings'
import { formatPoints } from './Scoreboard'
import { TeamChip, joinNames, teamStyle } from './team'

// One component per kind of screen in a game. They only read state; actions come from Controls.

export function DoubleTroubleBadge({ large = false }: { large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md bg-accent font-display font-extrabold text-on-accent ${
        large ? 'px-5 py-2 text-3xl' : 'px-3 py-1 text-lg'
      }`}
    >
      ×2 {t('game.doubleTrouble')}
    </span>
  )
}

export function RoundIntro({ game, roundIndex }: { game: GameState; roundIndex: number }) {
  const round = game.rounds[roundIndex]!
  const Icon = KIND_ICONS[round.kind]
  const hint =
    round.kind === 'true_false' || round.kind === 'estimate'
      ? t(`game.kindHints.${round.kind}`)
      : null
  return (
    <div key={roundIndex} className="pop-in flex flex-col items-center gap-5 text-center">
      <span className="font-terminal text-3xl text-text-muted sm:text-4xl">
        {t('game.roundNumber', { number: roundIndex + 1 })}
      </span>
      <Icon className="text-(length:--icon-hero) text-primary-text" />
      <h1 className="font-display text-4xl font-extrabold text-balance sm:text-5xl">
        {t(`topics.${round.kind}`)}
      </h1>
      {hint && <p className="max-w-3xl text-xl text-balance text-text-muted sm:text-2xl">{hint}</p>}
      {round.doubled && (
        <div className="mt-2 flex flex-col items-center gap-3">
          <DoubleTroubleBadge large />
          <p className="text-xl font-semibold sm:text-2xl">{t('game.doubleTroubleText')}</p>
        </div>
      )}
    </div>
  )
}

export function TeamIntro({ game }: { game: GameState }) {
  const turn = getCurrentTurn(game)!
  return (
    <div
      key={turn.team.id + turn.roundIndex}
      style={teamStyle(turn.team.color)}
      className="team-spotlight pop-in flex flex-col items-center gap-6 text-center"
    >
      <span className="text-2xl text-text-muted sm:text-3xl">{t('game.onTurn')}</span>
      <h1 className="team-banner font-display text-(length:--team-name-size) leading-tight font-extrabold text-balance">
        {turn.team.name}
      </h1>
      {turn.challenger && (
        <p className="max-w-3xl text-xl text-balance text-text-muted sm:text-2xl">
          {t('game.estimates', { team: turn.team.name })}{' '}
          {t('game.challenges', { team: turn.challenger.name })}
        </p>
      )}
    </div>
  )
}

const REVEALED: readonly StepType[] = [
  'answer',
  'judged',
  'fastestFingerAnswer',
  'fastestFingerJudged',
  'tiebreakAnswer',
]

/** Who the question is for, shown above it. */
function QuestionLabel({ game }: { game: GameState }) {
  const { step } = game
  const turn = getCurrentTurn(game)
  if (turn) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xl sm:text-2xl short:text-base">
        <span style={teamStyle(turn.team.color)} className="team-pill font-display font-extrabold">
          {turn.team.name}
        </span>
        {turn.challenger && (
          <span className="text-lg text-text-muted sm:text-xl">
            {t('game.challenges', { team: turn.challenger.name })}
          </span>
        )}
      </div>
    )
  }
  if (step.type.startsWith('fastestFinger')) {
    const teamId = 'teamId' in step ? step.teamId : null
    const team = teamId ? getTeam(game, teamId) : null
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-4 text-xl sm:text-2xl short:text-base">
        <span className="flex items-center gap-2 font-display font-extrabold text-secondary-text">
          <BoltIcon /> {t('game.forEveryone')}
        </span>
        {team && (
          <span style={teamStyle(team.color)} className="team-pill font-display font-extrabold">
            {t('game.answering', { team: team.name })}
          </span>
        )}
      </div>
    )
  }
  const tied = (game.tiebreak?.teamIds ?? []).map((id) => getTeam(game, id))
  return (
    <p className="shrink-0 text-center font-display text-xl font-extrabold sm:text-2xl">
      {t('game.tiebreak')} <span className="text-text-muted">{joinNames(tied, t('game.and'))}</span>
    </p>
  )
}

/** The host's decision on the current question, shown on the answer card until the game moves on. */
function verdictFor(game: GameState): Verdict | null {
  if (game.step.type !== 'judged' && game.step.type !== 'fastestFingerJudged') return null
  const result = game.results.at(-1)
  if (!result) return null
  const points = result.points === 0 ? '' : ` ${formatPoints(result.points)}`
  if (result.type === 'estimate') {
    return {
      correct: true,
      label: t('game.verdict.point', { team: getTeam(game, result.teamId).name }) + points,
    }
  }
  return {
    correct: result.correct,
    label: t(result.correct ? 'game.verdict.correct' : 'game.verdict.wrong') + points,
  }
}

export function QuestionStage({ game, onExpire }: { game: GameState; onExpire: () => void }) {
  const question = getActiveQuestion(game)!
  const timer = getTimer(game)
  const { step } = game
  const revealed = REVEALED.includes(step.type)
  return (
    <div className="flex h-full w-full flex-col items-center gap-(--game-gap)">
      <QuestionLabel game={game} />
      <FitText
        key={question.id}
        text={question.question}
        minRem={1.1}
        maxRem={revealed ? 3.25 : 5.5}
        className="max-w-[40ch] text-center leading-tight font-semibold text-balance"
      />
      {timer && step.type !== 'fastestFingerBuzzed' && (
        <GameTimer timer={timer} onExpire={onExpire} />
      )}
      {revealed && <AnswerCard question={question} verdict={verdictFor(game)} />}
      {step.type === 'fastestFingerAnswer' && step.teamId === null && (
        <p className="shrink-0 text-xl text-text-muted sm:text-2xl">{t('game.nobodyAnswered')}</p>
      )}
    </div>
  )
}

export function FastestFingerIntro() {
  return (
    <div className="pop-in flex flex-col items-center gap-5 text-center">
      <BoltIcon className="text-(length:--icon-hero) text-secondary-text" />
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
        {t('game.fastestFinger')}
      </h1>
      <p className="max-w-3xl text-xl text-balance text-text-muted sm:text-2xl">
        {t('game.fastestFingerText')}
      </p>
    </div>
  )
}

export function TiebreakIntro({ game }: { game: GameState }) {
  const tied = (game.tiebreak?.teamIds ?? []).map((id) => getTeam(game, id))
  return (
    <div className="pop-in flex flex-col items-center gap-6 text-center">
      <div className="flex gap-4">
        {tied.map((team) => (
          <TeamChip
            key={team.id}
            color={team.color}
            name={team.name}
            className="size-16 text-4xl sm:size-20 sm:text-5xl"
          />
        ))}
      </div>
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{t('game.tiebreak')}</h1>
      <p className="max-w-3xl text-xl text-balance text-text-muted sm:text-2xl">
        {t('game.tiebreakText', { teams: joinNames(tied, t('game.and')) })}
      </p>
    </div>
  )
}

/** Standings after a round, sliding teams from their previous places. */
export function LeaderboardStage({ game, roundIndex }: { game: GameState; roundIndex: number }) {
  const previous =
    roundIndex > 0
      ? getRankingAfterRound(game, roundIndex - 1)
      : game.teams.map((team) => ({ teamId: team.id, score: 0, rank: 1 }))
  return (
    <section className="flex max-h-full w-full max-w-6xl flex-col gap-4 overflow-y-auto">
      <h1 className="text-center font-display text-2xl font-extrabold lg:text-3xl">
        {t('game.leaderboard', { round: roundIndex + 1 })}
      </h1>
      <Standings
        game={game}
        ranking={getRankingAfterRound(game, roundIndex)}
        previous={previous}
        upToRound={roundIndex}
      />
    </section>
  )
}

/** Deterministic pseudo-random spread, so rendering stays pure. */
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 30) / 10,
  fall: 3 + ((i * 29) % 25) / 10,
  color: (['pink', 'cyan', 'amber', 'purple', 'blue', 'lime'] as const)[i % 6],
}))

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {CONFETTI.map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              '--delay': `${piece.delay}s`,
              '--fall': `${piece.fall}s`,
              '--piece': `var(--team-${piece.color})`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export function EndStage({ game }: { game: GameState }) {
  const outcome = getOutcome(game)!
  const winner = getTeam(game, outcome.winnerId)
  return (
    <section className="flex max-h-full w-full max-w-6xl flex-col items-center gap-5 overflow-y-auto">
      <Confetti />
      <div
        className="pop-in flex flex-col items-center gap-3 text-center"
        style={teamStyle(winner.color)}
      >
        <TeamChip
          color={winner.color}
          name={winner.name}
          className="size-20 text-4xl sm:size-24 sm:text-5xl"
        />
        <h1 className="font-display text-3xl font-extrabold text-balance sm:text-4xl">
          {t('game.winner', { team: winner.name })}
        </h1>
      </div>
      <Standings
        game={game}
        ranking={outcome.ranking}
        upToRound={game.rounds.length - 1}
        lastPlaceTeamIds={outcome.lastPlaceTeamIds}
      />
    </section>
  )
}
