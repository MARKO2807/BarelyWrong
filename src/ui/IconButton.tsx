import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name and tooltip; the icon itself is decorative. */
  label: string
}

export function IconButton({ label, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={className ? `icon-btn ${className}` : 'icon-btn'}
      {...props}
    >
      {children}
    </button>
  )
}
