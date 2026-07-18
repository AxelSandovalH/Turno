import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// ⚠️ TEMPORAL — smoke test de Stripe en Live con cargo mínimo. REVERTIR a 89900 después.
const PLANS: Record<string, { name: string; amount: number; description: string }> = {
  'landing':     { name: 'Turno — Página web',              amount: 2000,  description: 'Página web profesional para tu negocio' },
  'turno-sys':   { name: 'Turno — Agenda',                  amount: 129900, description: 'Calendario de citas y recordatorios por WhatsApp' },
  'turno-ai':    { name: 'Turno — Agenda + Asistente',      amount: 279900, description: 'Tu WhatsApp contesta y agenda solo, 24/7' },
  'bundle-sys':  { name: 'Turno — Página web + Agenda',     amount: 179900, description: 'Combo con ahorro de $399/mes' },
  'bundle-ai':   { name: 'Turno — Página web + Asistente',  amount: 329900, description: 'Combo con ahorro de $499/mes' },
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const planKey: string = body.planKey ?? 'turno-ai'
  const plan = PLANS[planKey] ?? PLANS['turno-ai']

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, stripe_customer_id').eq('id', orgId).single()

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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/appointments?payment=success`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/payment`,
    metadata: { organization_id: orgId, plan: planKey },
    subscription_data: { metadata: { organization_id: orgId, plan: planKey } },
  })

  return NextResponse.json({ url: session.url })
}
