import { useState, type CSSProperties, type ReactNode } from 'react'
import background from '../../../assets/login-bg.webp?hero'
import portraitBackground from '../../../assets/login-bg-mobile.webp?hero'
import creature from '../../../assets/login-creature.webp?sprite'
import hunter from '../../../assets/login-hunter.webp?sprite'
import { usePortrait } from '../../ui/hooks'
import { Picture } from '../../ui/Picture'

/** Where a character stands, in % of the 1672 × 941 background: left edge, width, feet. */
interface Placement {
  left: number
  width: number
  bottom: number
}

// The hunter stands close on the right, looking left at the creature coming down the stairs
// under the balcony.
const HUNTER: Placement = { left: 38, width: 18, bottom: 2 }
const CREATURE: Placement = { left: 15.6, width: 5.4, bottom: 24.9 }

function placementStyle({ left, width, bottom }: Placement): CSSProperties {
  return { left: `${left}%`, width: `${width}%`, bottom: `${bottom}%` }
}

/**
 * The editor sign-in page: the neon alley with the hunter and the creature on the left and the
 * form on the dark wall on the right. The picture keeps its proportions and is anchored to the
 * right, so the wall (and the form on it) is always on screen. Tall screens get the portrait
 * alley as a plain background.
 */
export function LoginScene({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const portrait = usePortrait()
  return (
    <main data-scheme="dark" className="login-stage relative h-dvh overflow-hidden bg-bg text-text">
      {portrait ? (
        <Picture
          picture={portraitBackground}
          sizes="100vw"
          priority
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`login-scene transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <Picture
            picture={background}
            sizes="100vw"
            priority
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 size-full"
          />
          <div className="login-creature absolute" style={placementStyle(CREATURE)}>
            <span className="login-ground-shadow" />
            <Picture picture={creature} sizes="12vw" className="login-lurk h-auto w-full" />
          </div>
          <div className="login-hunter absolute" style={placementStyle(HUNTER)}>
            <span className="login-ground-shadow" />
            <Picture picture={hunter} sizes="30vw" className="login-breathe h-auto w-full" />
          </div>
        </div>
      )}
      <div className="login-form-layer">{children}</div>
    </main>
  )
}
