import logo from '../../assets/logo.png?logo'
import { t } from '../i18n'
import { LOGO_SIZES as SIZES } from './logoSizes'

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
