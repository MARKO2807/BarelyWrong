import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authStorage } from '../storage'
import { projectOrigin } from './supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * The editor's own client: unlike the game's, it keeps the sign-in between visits (through
 * src/storage). Null when Supabase isn't configured.
 */
export const editorDb: SupabaseClient | null =
  url && anonKey
    ? createClient(projectOrigin(url), anonKey, {
        auth: {
          storage: authStorage,
          storageKey: 'editor',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null

/** The editor role is set in app_metadata, which only the database owner can change. */
export function isEditor(appMetadata: Record<string, unknown> | undefined): boolean {
  return appMetadata?.role === 'editor'
}
