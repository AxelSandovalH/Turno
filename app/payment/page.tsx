import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PaymentClient } from './payment-client'

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ renew?: string }> }) {
  const { renew } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const orgId = user.user_metadata?.organization_id
  if (!orgId) redirect('/onboarding')

  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('subscription_status, stripe_subscription_id')
    .eq('id', orgId)
    .single()

  // Un negocio activo no necesita esta pantalla, salvo para renovar un prepago
  if (org?.subscription_status === 'active' && renew !== '1') redirect('/appointments')

  return <PaymentClient trial={!org?.stripe_subscription_id} />
}
