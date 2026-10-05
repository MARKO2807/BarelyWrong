import logo from '../../assets/logo.png?logo'
import { t } from '../i18n'

/** Rendered widths, so the browser picks the right file from the srcset. */
const SIZES = {
  hero: '(orientation: portrait) 84vw, 34vw',
  header: '(orientation: portrait) 24vw, 10vw',
} as const

interface LogoProps {
  variant: keyof typeof SIZES
  className?: string
}

export function Logo({ variant, className }: LogoProps) {
  return (
    <picture>
      {Object.entries(logo.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={SIZES[variant]} />
      ))}
      <img
        src={logo.img.src}
        width={logo.img.w}
        height={logo.img.h}
        alt={t('app.name')}
        decoding="async"
        fetchPriority={variant === 'hero' ? 'high' : 'auto'}
        draggable={false}
        className={className}
      />
    </picture>
  )
}
