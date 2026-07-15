import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { NewOrderClient } from './new-order-client'

export default async function NewLabOrderPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const { data: tests } = await db
    .from('lab_tests')
    .select('id, name, description, price')
    .eq('organization_id', organization.id)
    .eq('is_active', true)
    .order('name')

  return <NewOrderClient tests={tests ?? []} organizationId={organization.id} />
}
