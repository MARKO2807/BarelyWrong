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
      // Equal columns as wide as the longest label (a flex row split the total evenly, cutting a
      // long label next to a short one); on a narrow screen they shrink together.
      className="grid w-fit max-w-full auto-cols-[minmax(0,1fr)] grid-flow-col gap-1 rounded-md bg-bg p-1"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="segmented-option has-focus-ring flex min-w-0 cursor-pointer items-center justify-center rounded-sm px-[clamp(0.4rem,2vw,1rem)] py-2 text-center font-display text-[length:clamp(0.8rem,4.2vw,1.125rem)] whitespace-nowrap font-extrabold text-text-muted transition-colors hover:text-text has-checked:bg-primary has-checked:text-on-primary"
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
