import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { loadSettings, saveSettings, type Settings } from '../storage'
import { DARK_SCHEME_QUERY, resolveTheme, type ResolvedTheme } from './theme'

interface SettingsContextValue {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  /** The theme actually shown, with "system" resolved. */
  resolvedTheme: ResolvedTheme
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function subscribeToSystemScheme(onChange: () => void) {
  const query = window.matchMedia(DARK_SCHEME_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemPrefersDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings)
  const systemDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark)
  const resolvedTheme = resolveTheme(settings.theme, systemDark)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    const background = getComputedStyle(root).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
  }, [resolvedTheme])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch }
      setSettings(next)
      saveSettings(next)
    },
    [settings],
  )

  const value = useMemo(
    () => ({ settings, updateSettings, resolvedTheme }),
    [settings, updateSettings, resolvedTheme],
  )

  return <SettingsContext value={value}>{children}</SettingsContext>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>')
  return context
}
