import { useCallback } from 'react'
import { useSettings } from '../../app/SettingsProvider'
import { SOUNDS, type SoundName } from './sfx'

/** Plays a sound effect unless sound is turned off in Settings. */
export function useSound(): (name: SoundName) => void {
  const { settings } = useSettings()
  return useCallback(
    (name: SoundName) => {
      if (settings.sound) SOUNDS[name]()
    },
    [settings.sound],
  )
}
