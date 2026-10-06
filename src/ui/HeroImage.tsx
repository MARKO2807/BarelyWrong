import { Sparkle } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import bgDark from '../../assets/hero-bg-dark.webp?hero'
import bgDarkPlaceholder from '../../assets/hero-bg-dark.webp?placeholder'
import bgLight from '../../assets/hero-bg-light.webp?hero'
import bgLightPlaceholder from '../../assets/hero-bg-light.webp?placeholder'
import brain from '../../assets/hero-brain.webp?sprite'
import brainly from '../../assets/hero-brainly.webp?sprite'
import hunter from '../../assets/hero-hunter.webp?sprite'
import type { Theme } from '../storage'

/** Where a character stands, in % of the 1672 × 941 background: left edge, width, feet. */
interface Placement {
  left: number
  width: number
  bottom: number
}

interface Scene {
  background: ResponsivePicture
  placeholder: string
  hunter: Placement
  brainly: Placement
  brain: Placement
}

// The platform sits a little lower in the daytime picture.
const SCENES: Record<Theme, Scene> = {
  dark: {
    background: bgDark,
    placeholder: bgDarkPlaceholder,
    hunter: { left: 6.7, width: 18.5, bottom: 24.9 },
    brainly: { left: 25.1, width: 12.7, bottom: 24.9 },
    brain: { left: 80.8, width: 5.5, bottom: 26 },
  },
  light: {
    background: bgLight,
    placeholder: bgLightPlaceholder,
    hunter: { left: 7.1, width: 19.7, bottom: 20.1 },
    brainly: { left: 26.7, width: 13.5, bottom: 20.1 },
    brain: { left: 80.7, width: 5.5, bottom: 21.2 },
  },
}

/**
 * Full-screen city for the theme with the hunter chasing Brainly towards the brain at the goal.
 * The characters are separate images, so they can move a little; only the active theme's
 * background is downloaded.
 */
export function HeroImage({ theme }: { theme: Theme }) {
  const scene = SCENES[theme]
  return (
    <div aria-hidden="true" className="hero-stage absolute inset-0 -z-10 overflow-hidden bg-bg">
      <img
        src={scene.placeholder}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
      />
      <HeroScene key={theme} scene={scene} />
      <div className="hero-top-shade absolute inset-x-0 top-0 h-1/3" />
    </div>
  )
}

function HeroScene({ scene }: { scene: Scene }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className={`hero-scene transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    >
      <Picture
        picture={scene.background}
        sizes="100vw"
        priority
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 size-full"
      />
      <Character picture={hunter} place={scene.hunter} motion="hero-sway" />
      <Character picture={brainly} place={scene.brainly} motion="hero-breathe" />
      <div className="absolute" style={placementStyle(scene.brain)}>
        <Picture
          picture={brain}
          sizes="10vw"
          className="hero-float hero-glow-pulse h-auto w-full"
        />
        <Sparkle className="hero-sparkle top-[-10%] left-[-25%] w-[30%]" />
        <Sparkle className="hero-sparkle top-[5%] right-[-30%] w-[24%] [animation-delay:0.7s]" />
        <Sparkle className="hero-sparkle bottom-[0%] left-[-12%] w-[20%] [animation-delay:1.4s]" />
      </div>
    </div>
  )
}

function placementStyle({ left, width, bottom }: Placement): CSSProperties {
  return { left: `${left}%`, width: `${width}%`, bottom: `${bottom}%` }
}

function Character({
  picture,
  place,
  motion,
}: {
  picture: ResponsivePicture
  place: Placement
  motion: string
}) {
  return (
    <div className="absolute" style={placementStyle(place)}>
      <Picture picture={picture} sizes="25vw" className={`${motion} h-auto w-full`} />
    </div>
  )
}

function Picture({
  picture,
  sizes,
  className,
  priority = false,
  onLoad,
}: {
  picture: ResponsivePicture
  sizes: string
  className?: string
  priority?: boolean
  onLoad?: () => void
}) {
  return (
    <picture>
      {Object.entries(picture.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={sizes} />
      ))}
      <img
        src={picture.img.src}
        width={picture.img.w}
        height={picture.img.h}
        alt=""
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onLoad={onLoad}
        className={`block ${className ?? ''}`}
      />
    </picture>
  )
}
