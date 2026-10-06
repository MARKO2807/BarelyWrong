import type { RoundKind, TeamColor } from '../../engine'
import { createPixelIcon } from './PixelIcon'

export type PixelIconComponent = ReturnType<typeof createPixelIcon>

// Round kinds (spec 6.5): ten topics plus true/false and estimate.

const Bulb = createPixelIcon('BulbIcon', [
  '....####....',
  '..########..',
  '.##########.',
  '.##########.',
  '.##########.',
  '.##########.',
  '..########..',
  '...######...',
  '....####....',
  '............',
  '....####....',
  '.....##.....',
])

const Trophy = createPixelIcon('TrophyIcon', [
  '.##########.',
  '##.######.##',
  '##.######.##',
  '.#.######.#.',
  '...######...',
  '....####....',
  '.....##.....',
  '.....##.....',
  '....####....',
  '...######...',
  '...######...',
])

const Clapper = createPixelIcon('ClapperIcon', [
  '###..###..##',
  '.###..###..#',
  '............',
  '############',
  '############',
  '############',
  '############',
  '############',
  '############',
])

const Notes = createPixelIcon('NotesIcon', [
  '....########',
  '....########',
  '....#......#',
  '....#......#',
  '....#......#',
  '....#......#',
  '.####...####',
  '#####..#####',
  '#####..#####',
  '.###....###.',
])

const Pin = createPixelIcon('PinIcon', [
  '...######...',
  '..########..',
  '.####..####.',
  '.###....###.',
  '.###....###.',
  '.####..####.',
  '..########..',
  '...######...',
  '....####....',
  '.....##.....',
])

const Hourglass = createPixelIcon('HourglassIcon', [
  '############',
  '.##########.',
  '..##....##..',
  '...##..##...',
  '....####....',
  '.....##.....',
  '....####....',
  '...######...',
  '..########..',
  '.##########.',
  '############',
])

const Temple = createPixelIcon('TempleIcon', [
  '.....##.....',
  '...######...',
  '.##########.',
  '############',
  '............',
  '.##..##..##.',
  '.##..##..##.',
  '.##..##..##.',
  '............',
  '############',
])

const Tree = createPixelIcon('TreeIcon', [
  '.....##.....',
  '....####....',
  '...######...',
  '..########..',
  '....####....',
  '...######...',
  '..########..',
  '.##########.',
  '.....##.....',
  '.....##.....',
])

const Flask = createPixelIcon('FlaskIcon', [
  '...######...',
  '....#..#....',
  '....#..#....',
  '....#..#....',
  '...#....#...',
  '..#......#..',
  '.##########.',
  '############',
  '############',
  '.##########.',
])

const Book = createPixelIcon('BookIcon', [
  '.###....###.',
  '#####..#####',
  '#####..#####',
  '#####..#####',
  '#####..#####',
  '#####..#####',
  '.####..####.',
  '.....##.....',
])

const Check = createPixelIcon('CheckIcon', [
  '..........##',
  '.........###',
  '........###.',
  '##.....###..',
  '###...###...',
  '.###.###....',
  '..#####.....',
  '...###......',
])

const Scale = createPixelIcon('ScaleIcon', [
  '.....##.....',
  '############',
  '.#...##...#.',
  '#.#..##..#.#',
  '#.#..##..#.#',
  '###..##..###',
  '.....##.....',
  '....####....',
  '...######...',
])

export const BoltIcon = createPixelIcon('BoltIcon', [
  '....####',
  '...####.',
  '..####..',
  '.####...',
  '########',
  '...####.',
  '..####..',
  '.####...',
  '.###....',
  '.##.....',
])

export const KIND_ICONS: Record<RoundKind | 'fastest_finger', PixelIconComponent> = {
  general: Bulb,
  sport: Trophy,
  film_tv: Clapper,
  music: Notes,
  geography: Pin,
  history: Hourglass,
  culture: Temple,
  nature: Tree,
  science_tech: Flask,
  language_literature: Book,
  true_false: Check,
  estimate: Scale,
  fastest_finger: BoltIcon,
}

// One icon per team colour, so teams stay recognisable without relying on colour alone.

const Heart = createPixelIcon('HeartIcon', [
  '.##...##.',
  '####.####',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
])

const Diamond = createPixelIcon('DiamondIcon', [
  '....#....',
  '...###...',
  '..#####..',
  '.#######.',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....#....',
])

const Star = createPixelIcon('StarIcon', [
  '.....#.....',
  '....###....',
  '....###....',
  '###########',
  '.#########.',
  '..#######..',
  '..#######..',
  '.####.####.',
  '.###...###.',
  '.##.....##.',
])

const Crown = createPixelIcon('CrownIcon', [
  '#....#....#',
  '##..###..##',
  '###.###.###',
  '###########',
  '###########',
  '###########',
  '...........',
  '###########',
])

const Drop = createPixelIcon('DropIcon', [
  '....#....',
  '....#....',
  '...###...',
  '..#####..',
  '.#######.',
  '#########',
  '#########',
  '#########',
  '.#######.',
  '..#####..',
])

const Clover = createPixelIcon('CloverIcon', [
  '....###....',
  '...#####...',
  '...#####...',
  '.##.###.##.',
  '###########',
  '###########',
  '.###.#.###.',
  '.....#.....',
  '....###....',
])

export const TEAM_ICONS: Record<TeamColor, PixelIconComponent> = {
  pink: Heart,
  cyan: Diamond,
  amber: Star,
  purple: Crown,
  blue: Drop,
  lime: Clover,
}

export const FullscreenIcon = createPixelIcon('FullscreenIcon', [
  '###....###',
  '#........#',
  '#........#',
  '..........',
  '..........',
  '..........',
  '..........',
  '#........#',
  '#........#',
  '###....###',
])

export const MenuIcon = createPixelIcon('MenuIcon', [
  '##########',
  '##########',
  '..........',
  '##########',
  '##########',
  '..........',
  '##########',
  '##########',
])

export const PauseIcon = createPixelIcon('PauseIcon', [
  '###..###',
  '###..###',
  '###..###',
  '###..###',
  '###..###',
  '###..###',
  '###..###',
  '###..###',
])

export const FlagIcon = createPixelIcon('FlagIcon', [
  '##........',
  '########..',
  '##########',
  '##########',
  '########..',
  '##........',
  '##........',
  '##........',
  '##........',
  '##........',
])
