/** Returns a number in [0, 1), like Math.random. Tests pass a seeded one. */
export type Rng = () => number

/** Small deterministic generator (mulberry32) for reproducible tests. */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Integer in [0, maxExclusive). */
export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickOne: nothing to pick from')
  return items[randomInt(rng, items.length)]!
}
