import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolvePlan, isPlanKey, isPrepaidMonths, TRIAL_DAYS, type PlanKey } from '@/lib/plans'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, stripe_customer_id, stripe_subscription_id, business_type, whatsapp_bot_enabled').eq('id', orgId).single()

  // Sin plan explícito (ej. reactivar desde Configuración) se usa el que corresponde al negocio
  const inferred: PlanKey = org?.business_type === 'restaurant' ? 'pedidos' : org?.whatsapp_bot_enabled ? 'asistente' : 'agenda'
  const plan = resolvePlan(isPlanKey(body?.planKey) ? body.planKey : inferred)
  // La prueba gratis es solo para quien nunca ha tenido suscripción
  const trialDays = org?.stripe_subscription_id ? undefined : TRIAL_DAYS

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

    // Prepago con OXXO o transferencia SPEI: un solo pago por 1 o 3 meses, sin renovación automática
    // (esos métodos no permiten cobros recurrentes). El acceso se activa cuando el pago se confirma.
    if (body?.mode === 'prepaid') {
      const months = isPrepaidMonths(body.months) ? body.months : 1
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      const prepaid = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['oxxo', 'customer_balance'],
        payment_method_options: {
          oxxo: { expires_after_days: 3 },
          customer_balance: { funding_type: 'bank_transfer', bank_transfer: { type: 'mx_bank_transfer' } },
        },
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'mxn',
            unit_amount: plan.amount * months,
            product_data: {
              name: `${plan.name} · ${months} ${months === 1 ? 'mes' : 'meses'}`,
              description: 'Prepago sin renovación automática',
            },
          },
        }],
        success_url: `${baseUrl}/payment/pendiente`,
        cancel_url: `${baseUrl}/payment`,
        metadata: { type: 'prepaid', organization_id: orgId, plan: plan.key, months: String(months) },
      })
      return NextResponse.json({ url: prepaid.url })
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
      subscription_data: { metadata: { organization_id: orgId, plan: plan.key }, ...(trialDays ? { trial_period_days: trialDays } : {}) },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe-checkout]', error)
    const message = error instanceof Error ? error.message : 'No se pudo iniciar el pago'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
