import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Portal de cliente de Stripe: cambiar tarjeta, ver facturas y cancelar la suscripción.
// Si el portal aún no tiene configuración se crea aquí, para no depender del dashboard de Stripe.
async function portalConfigurationId(): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({ is_default: true, active: true, limit: 1 })
  if (existing.data[0]) return existing.data[0].id
  const created = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Administra tu suscripción de QuickTurno' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: false },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: { enabled: true, options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'] },
      },
    },
  })
  return created.id
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const orgId = user?.user_metadata?.organization_id
  if (!user || !orgId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('stripe_customer_id').eq('id', orgId).single()
  if (!org?.stripe_customer_id) return NextResponse.json({ error: 'Aún no tienes una suscripción para administrar' }, { status: 400 })

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      configuration: await portalConfigurationId(),
      return_url: `${baseUrl}/settings`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe-portal]', err)
    return NextResponse.json({ error: 'No se pudo abrir el portal de suscripción. Intenta de nuevo.' }, { status: 500 })
  }
}
