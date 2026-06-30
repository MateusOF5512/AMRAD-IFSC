import {
  NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from '@/lib/env.generated'

/**
 * Variáveis públicas do frontend (inlined no bundle via env.generated.ts).
 * sync-env roda antes de dev/build e lê a raiz .env (local) ou process.env (produção).
 */
export function getPublicEnv() {
  return {
    supabaseUrl: NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: NEXT_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    siteUrl: NEXT_PUBLIC_SITE_URL || '',
  }
}
