import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrgStripe } from '@/lib/org-stripe'
import { markOrderPaid } from '@/lib/orders'
import { handleDepositPaid } from '@/lib/deposits'

/**
 * Webhook de la cuenta de Stripe PROPIA de un negocio. Se verifica con el secreto de ese negocio (no con el
 * de la plataforma) y solo se aceptan pagos de pedidos y anticipos que pertenezcan a ese mismo negocio.
 */
export async function POST(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Falta la firma' }, { status: 400 })

  let acct
  try { acct = await getOrgStripe(orgId) } catch (err) { console.error('[stripe-org-webhook] no se pudo leer la cuenta', err); return NextResponse.json({ error: 'Configuración inválida' }, { status: 500 }) }
  if (!acct) return NextResponse.json({ error: 'Este negocio no tiene Stripe propio' }, { status: 404 })

  let event: Stripe.Event
  try {
    event = acct.client.webhooks.constructEvent(body, sig, acct.webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    // El pago debe corresponder a ESTE negocio: un pedido o cita de otro no se puede marcar pagado desde aquí
    if (session.metadata?.organization_id && session.metadata.organization_id !== orgId) return NextResponse.json({ received: true })
    const db = createServiceClient()

    if (session.metadata?.type === 'order' && session.metadata.order_id && session.payment_status === 'paid') {
      const { data: order } = await db.from('orders').select('id').eq('id', session.metadata.order_id).eq('organization_id', orgId).maybeSingle()
      if (order) {
        const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
        await markOrderPaid(order.id, intent)
      }
    } else if (session.metadata?.type === 'deposit' && session.metadata.appointment_id) {
      const { data: appt } = await db.from('appointments').select('id').eq('id', session.metadata.appointment_id).eq('organization_id', orgId).maybeSingle()
      if (appt) await handleDepositPaid(db, appt.id)
    }
  }
  return NextResponse.json({ received: true })
}
