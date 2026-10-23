// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { claimReload } from '../storage'
import { isMissingChunk } from './RouteError'

describe('isMissingChunk', () => {
  it('knows the browsers’ wording for a code file that is gone', () => {
    const chrome = new TypeError(
      'Failed to fetch dynamically imported module: https://barelywrong.com/assets/EditorApp-B9OxEYP6.js',
    )
    expect(isMissingChunk(chrome)).toBe(true)
    expect(isMissingChunk(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isMissingChunk(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('leaves other errors alone', () => {
    expect(isMissingChunk(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isMissingChunk(null)).toBe(false)
  })
})

describe('claimReload', () => {
  beforeEach(() => sessionStorage.clear())

  it('reloads once, then not again within half a minute', () => {
    expect(claimReload(1_000_000)).toBe(true)
    expect(claimReload(1_010_000)).toBe(false)
    expect(claimReload(1_040_000)).toBe(true)
  })
})
