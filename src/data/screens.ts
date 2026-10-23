/** Kinds of screen in the activity log (spec 9.4); matches the checks in `visits` and `game_starts`. */
export const SCREENS = ['phone', 'tablet', 'laptop', 'large'] as const
export type Screen = (typeof SCREENS)[number]
