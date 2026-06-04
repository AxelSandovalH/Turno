import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PaymentClient } from './payment-client'

export default async function PaymentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = user.user_metadata?.organization_id
  if (!orgId) redirect('/onboarding')

  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('subscription_status')
    .eq('id', orgId)
    .single()

  if (org?.subscription_status === 'active') redirect('/appointments')

  // Pasar price IDs desde el servidor (nunca exponer al cliente directamente)
  const prices: Record<string, string> = {
    STRIPE_PRICE_LANDING:    process.env.STRIPE_PRICE_LANDING    ?? '',
    STRIPE_PRICE_TURNO_SYS:  process.env.STRIPE_PRICE_TURNO_SYS  ?? '',
    STRIPE_PRICE_TURNO_AI:   process.env.STRIPE_PRICE_TURNO_AI   ?? '',
    STRIPE_PRICE_BUNDLE_SYS: process.env.STRIPE_PRICE_BUNDLE_SYS ?? '',
    STRIPE_PRICE_BUNDLE_AI:  process.env.STRIPE_PRICE_BUNDLE_AI  ?? '',
  }

  return <PaymentClient prices={prices} />
}
