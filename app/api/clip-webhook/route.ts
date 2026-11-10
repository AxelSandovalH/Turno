import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgClip, getClipCheckoutStatus } from '@/lib/clip'
import { markEventRegistrationPaid } from '@/lib/events-paid'

/**
 * Webhook de Clip (Checkout Redireccionado). La notificación NO viene firmada y solo trae el id del link de pago,
 * así que nunca se confía en ella: se consulta a Clip, con las credenciales del negocio, y solo si el estado es
 * CHECKOUT_COMPLETED se marca la inscripción como pagada. Siempre responde 200 rápido para que Clip no reintente.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { id?: string } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ ok: true })

  try {
    const db = createServiceClient()
    const { data: reg } = await db.from('event_registrations').select('id, organization_id, amount, status').eq('clip_payment_id', id).maybeSingle()
    if (!reg || reg.status === 'paid') return NextResponse.json({ ok: true })

    const clip = await getOrgClip(reg.organization_id)
    if (!clip) return NextResponse.json({ ok: true })
    const status = await getClipCheckoutStatus(clip.token, id)
    if (status === 'CHECKOUT_COMPLETED') await markEventRegistrationPaid(db, reg.id, Number(reg.amount))
    else console.log('[clip-webhook] estado', status, 'para', id)
  } catch (err) {
    console.error('[clip-webhook] falló', err)
  }
  return NextResponse.json({ ok: true })
}
