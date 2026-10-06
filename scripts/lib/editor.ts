// Signs the scripts in as the editor (BW_EDITOR_EMAIL / BW_EDITOR_PASSWORD in .env.local), so they
// go through the same database rules as the /urednik screens.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export async function editorClient(): Promise<SupabaseClient> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  const email = process.env.BW_EDITOR_EMAIL
  const password = process.env.BW_EDITOR_PASSWORD
  if (!url || !key || !email || !password) {
    throw new Error(
      'Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, BW_EDITOR_EMAIL and BW_EDITOR_PASSWORD in .env.local.',
    )
  }
  const db = createClient(new URL(url).origin, key, { auth: { persistSession: false } })
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Editor sign-in failed: ${error.message}`)
  if (data.user.app_metadata.role !== 'editor') {
    throw new Error(
      'This account is not marked as the editor (app_metadata.role); see supabase/migrations/*_editor.sql.',
    )
  }
  return db
}
