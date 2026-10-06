import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

interface FieldProps {
  label: string
  hint?: string
  className?: string
  children: (id: string, hintId: string | undefined) => ReactNode
}

/** Label, control and an optional hint, wired together for screen readers. */
export function Field({ label, hint, className, children }: FieldProps) {
  const id = useId()
  const hintId = useId()
  return (
    <div className={['flex min-w-0 flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className="font-display text-base font-extrabold">
        {label}
      </label>
      {children(id, hint ? hintId : undefined)}
      {hint && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

const control = 'field-control'

export function TextInput({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id, hintId) => <input id={id} aria-describedby={hintId} className={control} {...props} />}
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id, hintId) => (
        <textarea id={id} aria-describedby={hintId} className={control} rows={3} {...props} />
      )}
    </Field>
  )
}

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  ...props
}: {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  return (
    <Field label={label} className={className}>
      {(id) => (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={control}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="has-focus-ring flex cursor-pointer items-center gap-2 rounded-sm py-1 font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-(--primary)"
      />
      {label}
    </label>
  )
}
