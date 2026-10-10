import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPlanKey } from '@/lib/plans'

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
      // Usuario de Google sin negocio todavía: completa los datos en el registro,
      // conservando el plan elegido y, si ya pagó desde un anuncio, su sesión de Stripe
      const plan = searchParams.get('plan')
      const sessionId = searchParams.get('session_id')
      const next = new URLSearchParams()
      if (isPlanKey(plan)) next.set('plan', plan)
      if (sessionId) next.set('session_id', sessionId)
      const qs = next.toString()
      return NextResponse.redirect(`${origin}/register${qs ? `?${qs}` : ''}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
