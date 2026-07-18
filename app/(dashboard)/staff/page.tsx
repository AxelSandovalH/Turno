import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { staffLabel as getStaffLabel } from '@/lib/business-type'
import { StaffList } from './staff-list'

export default async function StaffPage() {
  const { organization } = await requireOrganization()
  const service = createServiceClient()

  const [{ data: staff }, { data: roleTags }] = await Promise.all([
    service
      .from('staff')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    service
      .from('staff_roles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('label', { ascending: true }),
  ])

  const label = getStaffLabel(organization.business_type)
  const labelPlural = getStaffLabel(organization.business_type, true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{labelPlural}</h1>
        <p className="text-muted-foreground text-sm">Gestiona el equipo de tu negocio</p>
      </div>
      <StaffList
        staff={staff ?? []}
        roleTags={roleTags ?? []}
        organizationId={organization.id}
        staffLabel={label}
        defaultRole={label}
      />
    </div>
  )
}
