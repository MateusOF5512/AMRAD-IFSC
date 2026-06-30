import { NextResponse } from 'next/server'
import { getRequestOrigin } from '@/lib/request-origin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getRequestOrigin(request)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/auth/callback/complete`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
