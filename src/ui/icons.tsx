import {
  Atom,
  BookOpen,
  Bomb,
  Bot,
  Cat,
  CheckCheck,
  Clapperboard,
  Crown,
  Flag,
  Ghost,
  Globe,
  Landmark,
  Leaf,
  Lightbulb,
  Maximize,
  Menu,
  Minimize,
  Minus,
  Music,
  Palette,
  PencilLine,
  Pizza,
  Play,
  Plus,
  Rocket,
  ScrollText,
  Settings,
  Snail,
  Target,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { ScoreColumn, TeamIcon } from '../engine'

// Every icon in the app (lucide). Sized by the font size (1em), drawn in the current text colour.

export type IconComponent = (props: { className?: string }) => React.JSX.Element

function icon(Glyph: LucideIcon): IconComponent {
  function Icon({ className }: { className?: string }) {
    return (
      <Glyph
        aria-hidden="true"
        focusable="false"
        strokeWidth={2.25}
        className={className ? `ui-icon ${className}` : 'ui-icon'}
      />
    )
  }
  Icon.displayName = `${Glyph.displayName ?? 'Lucide'}Icon`
  return Icon
}

export const PlayIcon = icon(Play)
export const SettingsIcon = icon(Settings)
export const RulesIcon = icon(ScrollText)
export const CloseIcon = icon(X)
export const MenuIcon = icon(Menu)
export const FullscreenIcon = icon(Maximize)
export const ExitFullscreenIcon = icon(Minimize)
export const FlagIcon = icon(Flag)
export const BoltIcon = icon(Zap)
export const PlusIcon = icon(Plus)
export const MinusIcon = icon(Minus)
export const CorrectionIcon = icon(PencilLine)

/** Round kinds and the extra score-table columns (spec 6.5). */
export const KIND_ICONS: Record<ScoreColumn, IconComponent> = {
  general: icon(Lightbulb),
  sport: icon(Trophy),
  film_tv: icon(Clapperboard),
  music: icon(Music),
  geography: icon(Globe),
  history: icon(Landmark),
  culture: icon(Palette),
  nature: icon(Leaf),
  science_tech: icon(Atom),
  language_literature: icon(BookOpen),
  true_false: icon(CheckCheck),
  estimate: icon(Target),
  fastest_finger: icon(Zap),
  correction: CorrectionIcon,
}

/** The icons a team can pick (src/engine TEAM_ICONS). */
export const TEAM_ICON_GLYPHS: Record<TeamIcon, IconComponent> = {
  rocket: icon(Rocket),
  ghost: icon(Ghost),
  crown: icon(Crown),
  cat: icon(Cat),
  pizza: icon(Pizza),
  bomb: icon(Bomb),
  snail: icon(Snail),
  bot: icon(Bot),
}
