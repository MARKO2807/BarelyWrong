import { z } from 'zod'

/** PostgREST returns at most 1000 rows per request; read everything in pages. */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  schema: z.ZodType<T>,
): Promise<T[]> {
  const size = 1000
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) throw error
    const parsed = z.array(schema).parse(data)
    rows.push(...parsed)
    if (parsed.length < size) return rows
  }
}
