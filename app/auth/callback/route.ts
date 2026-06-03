import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {}
      if (meta.is_platform_admin) {
        return NextResponse.redirect(`${origin}/admin`)
      }
      if (meta.organization_id) {
        return NextResponse.redirect(`${origin}/appointments`)
      }
      // Google user with no org yet → onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
