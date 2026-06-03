import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, stripe_customer_id').eq('id', orgId).single()

  // Create or reuse Stripe customer
  let customerId = org?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name,
      metadata: { organization_id: orgId, user_id: user.id },
    })
    customerId = customer.id
    await db.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?payment=cancelled`,
    metadata: { organization_id: orgId },
    subscription_data: { metadata: { organization_id: orgId } },
  })

  return NextResponse.json({ url: session.url })
}
