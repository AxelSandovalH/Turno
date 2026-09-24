import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePlan } from '@/lib/plans'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const plan = resolvePlan(body?.planKey)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, stripe_customer_id').eq('id', orgId).single()

  try {
    // Crear o reutilizar cliente Stripe
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
      // Sin payment_method_types fijo: Stripe habilita solo los métodos
      // activos en el dashboard (tarjeta, Apple Pay, Google Pay, Link) —
      // pagar con wallet es un toque, sin teclear la tarjeta.
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'mxn',
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
          product_data: {
            name: plan.name,
            description: plan.description,
          },
        },
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments?payment=success`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/payment`,
      // El webhook usa `plan` para prender/apagar el bot de WhatsApp de la org
      metadata: { organization_id: orgId, plan: plan.key },
      subscription_data: { metadata: { organization_id: orgId, plan: plan.key } },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe-checkout]', error)
    const message = error instanceof Error ? error.message : 'No se pudo iniciar el pago'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
