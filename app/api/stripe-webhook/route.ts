import { NextResponse } from 'next/server'
import { recordFunnel } from '@/lib/funnel/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { resend, FROM } from '@/lib/resend'
import { welcomeEmailHtml, welcomeEmailText } from '@/lib/emails/welcome'
import { planHasBot } from '@/lib/plans'
import { markOrderPaid } from '@/lib/orders'
import { activatePrepaid } from '@/lib/billing'
import { handleDepositPaid } from '@/lib/deposits'
import { isPlanKey, isPrepaidMonths } from '@/lib/plans'
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

      // Prepago OXXO / SPEI: con OXXO el pago llega después (async_payment_succeeded);
      // si el dinero ya estaba disponible llega aquí como 'paid'
      if (session.metadata?.type === 'prepaid') {
        if (session.payment_status === 'paid') await handlePrepaidPaid(session)
        break
      }

      // Pedido pagado con tarjeta: recién ahora llega al tablero del negocio
      if (session.metadata?.type === 'order') {
        const orderId = session.metadata.order_id
        const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
        if (orderId && session.payment_status === 'paid') await markOrderPaid(orderId, intent)
        break
      }

      const orgId = session.metadata?.organization_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subId = (session as any).subscription as string | null
      if (orgId) {
        let trialEnd: string | null = null
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
          } catch { /* sin fecha de prueba: no es crítico */ }
        }
        const { data: org } = await db
          .from('organizations')
          .update({
            subscription_status: 'active',
            // Si antes pagaba por adelantado, pasar a tarjeta lo saca del control de vencimientos
            payment_mode: 'subscription',
            paid_until: null,
            trial_ends_at: trialEnd,
            // El plan 'agenda' no incluye el bot de WhatsApp
            whatsapp_bot_enabled: planHasBot(session.metadata?.plan),
            ...(subId ? { stripe_subscription_id: subId } : {}),
          })
          .eq('id', orgId)
          .select('name, whatsapp_number')
          .single()
        await recordFunnel('subscribed', { orgId })

        // Bienvenida hasta que el cobro está confirmado — antes salía al crear
        // la cuenta y llegaba mientras el usuario seguía en el checkout.
        if (org) {
          const { data: owner } = await db
            .from('staff')
            .select('email')
            .eq('organization_id', orgId)
            .eq('is_owner', true)
            .limit(1)
            .maybeSingle()

          const to = owner?.email ?? session.customer_details?.email
          if (to) {
            const props = { businessName: org.name, whatsappNumber: org.whatsapp_number ?? '' }
            resend.emails.send({
              from: FROM,
              to,
              subject: `¡Bienvenido a QuickTurno, ${org.name}!`,
              html: welcomeEmailHtml(props),
              text: welcomeEmailText(props),
            }).catch(err => console.error('[stripe-webhook] welcome email failed:', err))
          }
        }
      }
      break
    }

    // OXXO y transferencia SPEI se confirman horas o días después de generar la referencia
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.type === 'prepaid') await handlePrepaidPaid(session)
      break
    }

    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.warn('[stripe-webhook] pago OXXO/SPEI fallido o vencido:', session.id, session.metadata?.organization_id)
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

async function handlePrepaidPaid(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organization_id
  const plan = session.metadata?.plan
  const months = Number(session.metadata?.months)
  if (orgId) await recordFunnel('subscribed', { orgId })
  if (!orgId || !isPlanKey(plan) || !isPrepaidMonths(months)) {
    console.error('[stripe-webhook] prepago con metadata incompleta', session.id)
    return
  }
  const result = await activatePrepaid(orgId, plan, months, session.id)
  if (!result || !result.firstActivation) return

  // Bienvenida solo en la primera activación (las renovaciones no la repiten)
  const db = createServiceClient()
  const { data: owner } = await db.from('staff').select('email').eq('organization_id', orgId).eq('is_owner', true).limit(1).maybeSingle()
  const to = owner?.email ?? session.customer_details?.email
  if (to) {
    const props = { businessName: result.name, whatsappNumber: result.whatsappNumber }
    await resend.emails.send({
      from: FROM, to,
      subject: `¡Bienvenido a QuickTurno, ${result.name}!`,
      html: welcomeEmailHtml(props), text: welcomeEmailText(props),
    }).catch(err => console.error('[stripe-webhook] welcome email failed:', err))
  }
}

