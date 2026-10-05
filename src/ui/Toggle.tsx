interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** id of the element that names this switch. */
  labelledBy: string
  onLabel: string
  offLabel: string
}

export function Toggle({ checked, onChange, labelledBy, onLabel, offLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className="group inline-flex cursor-pointer items-center gap-3 rounded-full font-display text-lg font-extrabold"
    >
      <span className="flex h-8 w-14 items-center rounded-full bg-border p-1 transition-colors group-aria-checked:bg-primary">
        <span className="size-6 rounded-full bg-text-muted transition-transform group-aria-checked:translate-x-6 group-aria-checked:bg-on-primary" />
      </span>
      <span aria-hidden="true">{checked ? onLabel : offLabel}</span>
    </button>
  )
}
