import { redirect } from 'next/navigation'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { CatalogClient } from './catalog-client'

export default async function LabTestsPage() {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'lab-orders')) redirect('/appointments')

  const db = createServiceClient()
  const [{ data: tests }, { data: analytes }] = await Promise.all([
    db.from('lab_tests')
      .select('*, lab_test_analytes(id, analyte_id, sort_order)')
      .eq('organization_id', organization.id)
      .order('name'),
    db.from('lab_analytes')
      .select('*')
      .eq('organization_id', organization.id)
      .order('name'),
  ])

  return (
    <CatalogClient
      tests={tests ?? []}
      analytes={analytes ?? []}
      organizationId={organization.id}
    />
  )
}
