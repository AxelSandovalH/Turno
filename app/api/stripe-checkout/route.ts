import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PLANS, resolvePlan, isPlanKey, isPrepaidMonths, planKeyFor, planKeyForOrg, planLineItems, segmentForType, trialEligible, TRIAL_DAYS } from '@/lib/plans'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const orgId = user.user_metadata?.organization_id
  if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name, stripe_customer_id, stripe_subscription_id, paid_until, business_type, whatsapp_bot_enabled').eq('id', orgId).single()

  // Sin plan explícito (ej. reactivar desde Configuración) se usa el que corresponde al negocio
  const inferred = planKeyForOrg(org?.business_type, !!org?.whatsapp_bot_enabled)
  const requested = resolvePlan(isPlanKey(body?.planKey) ? body.planKey : inferred)
  // El precio lo decide el giro del negocio (tours, restaurante o citas); de la pantalla solo se toma si lleva asistente
  const plan = PLANS[planKeyFor(segmentForType(org?.business_type), requested.bot)]
  // La prueba gratis es solo para el plan básico y para quien nunca ha tenido suscripción
  const trialDays = org?.stripe_subscription_id || org?.paid_until || !trialEligible(plan) ? undefined : TRIAL_DAYS

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
        line_items: planLineItems(plan, { recurring: false, months }),
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
      line_items: planLineItems(plan, { recurring: true }),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/setup?payment=success`,
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
