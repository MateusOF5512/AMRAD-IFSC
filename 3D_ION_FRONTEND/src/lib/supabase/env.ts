import { getPublicEnv } from '@/lib/public-env'

export function getSupabaseConfig() {
  const { supabaseUrl: url, supabaseAnonKey: anonKey } = getPublicEnv()

  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the root .env (local) or in the host environment (production), then run "npm run sync-env".'
    )
  }

  return { url, anonKey }
}
