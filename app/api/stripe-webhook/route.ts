import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import type Stripe from 'stripe'

export async function POST(req: Request) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Deposit (one-time payment) checkout — distinct from subscription checkout
      if (session.metadata?.type === 'deposit') {
        const appointmentId = session.metadata.appointment_id
        if (appointmentId) await handleDepositPaid(db, appointmentId)
        break
      }

      const orgId = session.metadata?.organization_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (session as any).subscription as string | null
      if (orgId) {
        await db.from('organizations').update({
          subscription_status: 'active',
          ...(subId ? { stripe_subscription_id: subId } : {}),
        }).eq('id', orgId)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (invoice as any).subscription as string | null
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId)
        const orgId = sub.metadata?.organization_id
        if (orgId) {
          await db.from('organizations').update({ subscription_status: 'active' }).eq('id', orgId)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (invoice as any).subscription as string | null
      if (!subId) break
      const sub = await stripe.subscriptions.retrieve(subId)
      const orgId = sub.metadata?.organization_id
      if (orgId) {
        await db.from('organizations').update({ subscription_status: 'suspended' }).eq('id', orgId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = sub.metadata?.organization_id
      if (orgId) {
        await db.from('organizations').update({ subscription_status: 'canceled' }).eq('id', orgId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function handleDepositPaid(db: ReturnType<typeof createServiceClient>, appointmentId: string) {
  const { data: appt } = await db
    .from('appointments')
    .select(`
      id, status, starts_at,
      customer:customers(name, phone),
      service:services(name),
      organization:organizations(name, whatsapp_number, ultramsg_instance, ultramsg_token, timezone)
    `)
    .eq('id', appointmentId)
    .single()

  if (!appt) return

  await db.from('appointments').update({
    deposit_status: 'paid',
    deposit_paid_at: new Date().toISOString(),
  }).eq('id', appointmentId)

  const customer = appt.customer as unknown as { name: string | null; phone: string } | null
  const svc = appt.service as unknown as { name: string } | null
  const org = appt.organization as unknown as {
    name: string; whatsapp_number: string; ultramsg_instance: string | null; ultramsg_token: string | null; timezone: string
  } | null
  if (!org) return

  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }

  // El cron de deposit-timeout ya canceló la cita antes de que llegara el pago —
  // el cliente pagó tarde. No reactivamos el horario (pudo tomarlo alguien más);
  // se notifica para que el negocio lo resuelva a mano.
  if (appt.status === 'cancelled') {
    if (customer?.phone) {
      sendMessage(
        customer.phone,
        `Recibimos tu pago, pero tu horario ya se había liberado por falta de confirmación a tiempo. Escríbenos para reagendar tu cita. 🙏`,
        creds
      ).catch(() => {})
    }
    sendMessage(
      `${org.whatsapp_number}@c.us`,
      `⚠️ *Anticipo pagado tarde*\n👤 ${customer?.name ?? customer?.phone ?? 'Cliente'}\nEl horario ya se había liberado. Contáctalo para reagendar.`,
      creds
    ).catch(() => {})
    return
  }

  const localTime = new Date(appt.starts_at).toLocaleString('es-MX', {
    timeZone: org.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  if (customer?.phone) {
    sendMessage(
      customer.phone,
      `✅ ¡Anticipo recibido! Tu cita de *${svc?.name ?? 'tu servicio'}* el ${localTime} quedó confirmada. Te esperamos en *${org.name}*.`,
      creds
    ).catch(() => {})
  }
  sendMessage(
    `${org.whatsapp_number}@c.us`,
    `💰 *Anticipo pagado*\n👤 ${customer?.name ?? customer?.phone ?? 'Cliente'}\n🕐 ${localTime}\nLa cita quedó confirmada.`,
    creds
  ).catch(() => {})
}
