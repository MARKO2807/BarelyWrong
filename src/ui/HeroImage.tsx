import { useState } from 'react'
import heroDark from '../../assets/hero-dark.png?hero'
import heroDarkPlaceholder from '../../assets/hero-dark.png?placeholder'
import heroLight from '../../assets/hero-light.png?hero'
import heroLightPlaceholder from '../../assets/hero-light.png?placeholder'
import type { ResolvedTheme } from '../app/theme'

const HEROES: Record<ResolvedTheme, { picture: ResponsivePicture; placeholder: string }> = {
  dark: { picture: heroDark, placeholder: heroDarkPlaceholder },
  light: { picture: heroLight, placeholder: heroLightPlaceholder },
}

/** Full-screen city for the theme; only the active theme's image is downloaded. */
export function HeroImage({ theme }: { theme: ResolvedTheme }) {
  const { picture, placeholder } = HEROES[theme]
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-bg">
      <img
        src={placeholder}
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
      />
      <HeroPicture key={theme} picture={picture} />
      <div className="hero-top-shade absolute inset-x-0 top-0 h-1/3" />
    </div>
  )
}

function HeroPicture({ picture }: { picture: ResponsivePicture }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <picture>
      {Object.entries(picture.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes="100vw" />
      ))}
      <img
        src={picture.img.src}
        width={picture.img.w}
        height={picture.img.h}
        alt=""
        fetchPriority="high"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </picture>
  )
}
