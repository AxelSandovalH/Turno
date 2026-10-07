import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isPlanKey } from '@/lib/plans'
import { createOfferToken, OFFER_HOURS } from '@/lib/offer'

// Solo administradores de la plataforma. El contador de 24 h empieza al generar el enlace.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.user_metadata?.is_platform_admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const plan = isPlanKey(body?.plan) ? body.plan : 'asistente'
  const { token, expiresAt } = createOfferToken(plan, OFFER_HOURS)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  return NextResponse.json({ url: `${baseUrl}/oferta/${token}`, expiresAt })
}
