import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'

type Theme = 'dark' | 'light'
type Tokens = Map<string, string>

interface Block {
  selectors: string[]
  body: string
}

/** Top-level rule blocks only; at-rules such as @media and @theme are skipped. */
function topLevelBlocks(css: string): Block[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks: Block[] = []
  let depth = 0
  let start = 0
  let prelude = ''
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '{') {
      if (depth === 0) {
        prelude = source.slice(start, i).trim()
        start = i + 1
      }
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        if (!prelude.startsWith('@')) {
          blocks.push({
            selectors: prelude.split(',').map((s) => s.trim().replaceAll('"', "'")),
            body: source.slice(start, i),
          })
        }
        start = i + 1
      }
    }
  }
  return blocks
}

function tokensFor(theme: Theme): Tokens {
  const tokens: Tokens = new Map()
  for (const block of topLevelBlocks(tokensCss)) {
    if (!block.selectors.some((s) => s === ':root' || s === `:root[data-theme='${theme}']`))
      continue
    for (const declaration of block.body.split(';')) {
      const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(declaration)
      if (match) tokens.set(match[1]!, match[2]!)
    }
  }
  return tokens
}

function resolveColor(tokens: Tokens, name: string): string {
  let value = tokens.get(name)
  for (let hops = 0; value?.startsWith('var(') && hops < 10; hops++) {
    value = tokens.get(value.slice(4, -1).trim())
  }
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`${name} does not resolve to a #rrggbb colour (got ${value})`)
  }
  return value
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

/** Every text colour on every background it is used on. */
const PAIRS: Array<[text: string, background: string]> = [
  ...[
    '--text',
    '--text-muted',
    '--primary-text',
    '--secondary-text',
    '--correct',
    '--wrong',
  ].flatMap((text) => ['--bg', '--surface'].map((bg): [string, string] => [text, bg])),
  ['--on-primary', '--primary'],
  ['--on-accent', '--accent'],
  ['--on-team-pink', '--team-pink'],
  ...[
    '--team-cyan',
    '--team-amber',
    '--team-purple',
    '--team-blue',
    '--team-lime',
    '--team-orange',
    '--team-red',
  ].map((team): [string, string] => ['--on-team', team]),
]

describe.each<Theme>(['dark', 'light'])('%s theme', (theme) => {
  const tokens = tokensFor(theme)

  it.each(PAIRS)('%s on %s has at least 4.5:1 contrast', (text, background) => {
    const ratio = contrast(resolveColor(tokens, text), resolveColor(tokens, background))
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

it('light theme overrides every token the dark theme defines', () => {
  const blocks = topLevelBlocks(tokensCss)
  const names = (selector: string) =>
    new Set(
      blocks
        .filter((b) => b.selectors.includes(selector))
        .flatMap((b) => [...b.body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])),
    )
  expect(names(":root[data-theme='light']")).toEqual(names(":root[data-theme='dark']"))
})
