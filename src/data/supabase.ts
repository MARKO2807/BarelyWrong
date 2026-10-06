import { PostgrestClient } from '@supabase/postgrest-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** The client adds /rest/v1 itself, so only the origin of the project URL is used. */
export function projectOrigin(value: string): string {
  return new URL(value).origin
}

/**
 * The game's database client: reading questions and sending statistics and reports is all it
 * does, so it is the bare REST client rather than the whole supabase-js (sign-in, realtime,
 * storage), which only the editor loads. Null until the env variables are set; the game then
 * runs offline.
 */
export const supabase: PostgrestClient | null =
  url && anonKey
    ? new PostgrestClient(`${projectOrigin(url)}/rest/v1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      })
    : null
