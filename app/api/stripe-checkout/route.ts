import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const PLANS: Record<string, { name: string; amount: number; description: string }> = {
  'turno-ai': { name: 'Turno — Agenda + Asistente', amount: 249900, description: 'Tu WhatsApp contesta y agenda solo, 24/7' },
}

// ⚠️ Oferta de lanzamiento — $1,299/mes los primeros 3 meses, luego $2,499/mes.
// Cupón creado en Stripe Live: id 3ZuBBrZd ($1,200 MXN off, repeating x3 meses).
const LAUNCH_COUPON_ID = '3ZuBBrZd'

export async function POST() {
  const plan = PLANS['turno-ai']

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
      payment_method_types: ['card'],
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
      discounts: [{ coupon: LAUNCH_COUPON_ID }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments?payment=success`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/payment`,
      metadata: { organization_id: orgId, plan: 'turno-ai' },
      subscription_data: { metadata: { organization_id: orgId, plan: 'turno-ai' } },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe-checkout]', error)
    const message = error instanceof Error ? error.message : 'No se pudo iniciar el pago'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
