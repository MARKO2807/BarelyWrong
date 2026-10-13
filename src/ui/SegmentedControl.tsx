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

/**
 * One-of-many choice built on native radios, so arrow keys work out of the box. The options
 * always stay on one line; on narrow screens the text gets smaller instead.
 */
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
      className="flex w-fit max-w-full gap-1 rounded-md bg-bg p-1"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="has-focus-ring min-w-0 flex-1 cursor-pointer rounded-sm px-[clamp(0.4rem,2vw,1rem)] py-2 text-center font-display text-[length:clamp(0.8rem,4.2vw,1.125rem)] whitespace-nowrap font-extrabold text-text-muted transition-colors hover:text-text has-checked:bg-primary has-checked:text-on-primary"
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
