import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shown before the label. */
  icon?: ReactNode
}

function buttonClassName(
  { variant = 'primary', size = 'md' }: ButtonStyleProps,
  className?: string,
) {
  return ['btn', `btn-${variant}`, `btn-${size}`, className].filter(Boolean).join(' ')
}

export function Button({
  variant,
  size,
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonStyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClassName({ variant, size }, className)} {...props}>
      {icon}
      {children}
    </button>
  )
}

/** A link that looks like a button, for actions that navigate. */
export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...props
}: ButtonStyleProps & LinkProps) {
  return (
    <Link className={buttonClassName({ variant, size }, className)} {...props}>
      {icon}
      {children}
    </Link>
  )
}
