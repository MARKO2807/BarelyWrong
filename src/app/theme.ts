import type { ThemePreference } from '../storage'

export type ResolvedTheme = 'light' | 'dark'

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}
