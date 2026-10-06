// Text clean-up for the import (spec 9.1) and the keys used to spot duplicates (spec 8.5).

/** Collapses whitespace and turns "straight" or “English” quotes into Croatian „…” ones. */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"([^"]*)"/g, '„$1”')
    .replace(/“([^”]*)”/g, '„$1”')
}

/** Lower case, no diacritics, no punctuation: „Đakovo!” and "dakovo" match. */
export function matchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Words in a question, not counting the „Točno ili netočno:” lead-in. */
export function wordCount(text: string): number {
  return matchKey(text.replace(/^Točno ili netočno:/, ''))
    .split(' ')
    .filter(Boolean).length
}
