import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isPlatformAdmin } from '@/lib/admin-guard'

// Acceso manual a un negocio sin pasar por Stripe (pruebas, cortesías). Solo el administrador de la plataforma.
// "grant" lo deja activo con el asistente de WhatsApp; "revoke" lo regresa a pendiente de pago, pero nunca toca
// a un negocio que ya tiene suscripción de Stripe o prepago: ese acceso lo manda el cobro, no este botón.
export async function POST(req: Request) {
  if (!(await isPlatformAdmin())) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = typeof b?.id === 'string' ? b.id : ''
  if (!id || !['grant', 'revoke'].includes(b?.action)) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('id, name, stripe_subscription_id, paid_until').eq('id', id).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  if (b.action === 'revoke') {
    if (org.stripe_subscription_id || org.paid_until) return NextResponse.json({ error: 'Este negocio paga con Stripe o prepago: su acceso no se quita desde aquí.' }, { status: 409 })
    const { error } = await db.from('organizations').update({ subscription_status: 'trialing', whatsapp_bot_enabled: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await db.from('organizations').update({ subscription_status: 'active', whatsapp_bot_enabled: true, trial_ends_at: null }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
