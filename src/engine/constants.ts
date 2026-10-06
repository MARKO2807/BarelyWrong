// Game rules from docs/SPEC.md, chapter 4. Names shown to players live in src/i18n.

export const TOPICS = [
  'general',
  'sport',
  'film_tv',
  'music',
  'geography',
  'history',
  'culture',
  'nature',
  'science_tech',
  'language_literature',
] as const
export type Topic = (typeof TOPICS)[number]

export const QUESTION_FORMATS = ['open', 'true_false', 'estimate'] as const
export type QuestionFormat = (typeof QUESTION_FORMATS)[number]

/** Ten topic rounds plus the true/false and estimate rounds. */
export const ROUND_KINDS = [...TOPICS, 'true_false', 'estimate'] as const
export type RoundKind = (typeof ROUND_KINDS)[number]

/** Each team picks one; two teams can't share it. */
export const TEAM_COLORS = [
  'pink',
  'cyan',
  'amber',
  'purple',
  'blue',
  'lime',
  'orange',
  'red',
  'yellow',
  'white',
] as const
export type TeamColor = (typeof TEAM_COLORS)[number]

export const MIN_TEAMS = 2
export const MAX_TEAMS = 4
export const TEAM_NAME_MAX_LENGTH = 20

export const GAME_LENGTHS = ['full', 'short'] as const
export type GameLength = (typeof GAME_LENGTHS)[number]
export const ROUNDS_PER_GAME: Record<GameLength, number> = { full: 12, short: 6 }

export const SECONDS_PER_QUESTION_OPTIONS = [30, 45, 60, 75, 90] as const
export type SecondsPerQuestion = (typeof SECONDS_PER_QUESTION_OPTIONS)[number]

export const DEFAULT_GAME_OPTIONS = {
  length: 'full',
  secondsPerQuestion: 60,
  fastestFinger: true,
} as const

/** Seconds added per question in the duration estimate: announcing, revealing, scoring. */
export const DURATION_OVERHEAD_SECONDS = 30

export const DOUBLE_TROUBLE_MULTIPLIER = 2

export const FASTEST_FINGER_SECONDS = 30
export const FASTEST_FINGER_CORRECT_POINTS = 2
export const FASTEST_FINGER_WRONG_POINTS = -1

/** One estimate question is kept aside in case teams tie for first place. */
export const TIEBREAK_QUESTIONS = 1
