import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
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
      const orgId = session.metadata?.organization_id
      if (orgId) {
        await db.from('organizations').update({
          subscription_status: 'active',
          stripe_subscription_id: session.subscription as string,
        }).eq('id', orgId)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
      const orgId = sub.metadata?.organization_id
      if (orgId) {
        await db.from('organizations').update({ subscription_status: 'active' }).eq('id', orgId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
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
        await db.from('organizations').update({ subscription_status: 'cancelled' }).eq('id', orgId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
