import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { FinanzasClient } from './finanzas-client'

export default async function FinanzasPage() {
  const { organization } = await requireOrganization()
  const db = createServiceClient()

  // Fetch last 90 days of payments + all completed appointments + staff
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const [
    { data: payments },
    { data: appointments },
    { data: staff },
  ] = await Promise.all([
    db.from('payments')
      .select('id, amount, method, status, concept, paid_at, staff_id, customer_id, created_at')
      .eq('organization_id', organization.id)
      .gte('paid_at', since.toISOString())
      .order('paid_at', { ascending: false }),
    db.from('appointments')
      .select('id, staff_id, status, starts_at')
      .eq('organization_id', organization.id)
      .eq('status', 'completed')
      .gte('starts_at', since.toISOString()),
    db.from('staff')
      .select('id, name, commission_type, commission_value, role')
      .eq('organization_id', organization.id)
      .eq('is_active', true),
  ])

  return (
    <FinanzasClient
      payments={payments ?? []}
      appointments={appointments ?? []}
      staff={staff ?? []}
    />
  )
}
