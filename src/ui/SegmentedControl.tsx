export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  /** Radio group name; must be unique on the page. */
  name: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  /** id of the element that names this group. */
  labelledBy: string
}

/** One-of-many choice built on native radios, so arrow keys work out of the box. */
export function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  labelledBy,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex flex-wrap gap-1 rounded-md bg-bg p-1"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="has-focus-ring cursor-pointer rounded-sm px-4 py-2 font-display text-lg font-extrabold text-text-muted transition-colors hover:text-text has-checked:bg-primary has-checked:text-on-primary"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
