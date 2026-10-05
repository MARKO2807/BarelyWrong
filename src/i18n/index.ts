import { hr } from './hr'

type Messages = typeof hr
type Leaf = string | readonly string[]

/** Dot paths to every leaf of type `V`, e.g. `'settings.sound.label'`. */
type Paths<T, V, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends V
    ? `${P}${K}`
    : T[K] extends Leaf
      ? never
      : Paths<T[K], V, `${P}${K}.`>
}[keyof T & string]

export type MessageKey = Paths<Messages, string>
export type MessageListKey = Paths<Messages, readonly string[]>
export type MessageVars = Record<string, string | number>

function lookup(key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], hr)
}

/** Returns the text for `key`, replacing `{name}` placeholders with `vars`. */
export function t(key: MessageKey, vars?: MessageVars): string {
  const text = lookup(key) as string
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export function tList(key: MessageListKey): readonly string[] {
  return lookup(key) as readonly string[]
}
