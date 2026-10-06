import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** The client adds /rest/v1 itself, so only the origin of the project URL is used. */
export function projectOrigin(value: string): string {
  return new URL(value).origin
}

/** Null until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set; the game then runs offline. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(projectOrigin(url), anonKey, { auth: { persistSession: false } })
    : null
