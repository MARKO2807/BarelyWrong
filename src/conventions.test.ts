import { describe, expect, it } from 'vitest'

// Project rules from CLAUDE.md that are easy to break by accident.

const sources = import.meta.glob<string>(
  ['./**/*.{ts,tsx,css}', '!./**/*.test.{ts,tsx}', '!./styles/tokens.css'],
  { query: '?raw', import: 'default', eager: true },
)

const files = Object.entries(sources)

function offenders(pattern: RegExp, skip: (path: string) => boolean = () => false): string[] {
  return files.filter(([path, source]) => !skip(path) && pattern.test(source)).map(([path]) => path)
}

describe('conventions', () => {
  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it('keeps raw colours in src/styles/tokens.css only', () => {
    expect(offenders(/#[0-9a-f]{3,8}\b(?![\w-])/i)).toEqual([])
    expect(offenders(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i)).toEqual([])
  })

  it('touches local storage only in src/storage', () => {
    expect(
      offenders(/\b(?:localStorage|sessionStorage)\b/, (path) => path.startsWith('./storage/')),
    ).toEqual([])
  })
})
