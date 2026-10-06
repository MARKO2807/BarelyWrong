interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** `supabase` to read questions from the database; anything else uses content/batches. */
  readonly VITE_QUESTIONS_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
