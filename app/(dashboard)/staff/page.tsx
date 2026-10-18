import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { staffLabel as getStaffLabel } from '@/lib/business-type'
import { StaffList } from './staff-list'

export default async function StaffPage() {
  const { organization } = await requireOrganization()
  const service = createServiceClient()

  const [{ data: staff }, { data: existingRoleTags }, { data: svcList }, { data: svcLinks }] = await Promise.all([
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
    service.from('services').select('id, name, is_active').eq('organization_id', organization.id).order('name'),
    service.from('staff_services').select('staff_id, service_id'),
  ])
  const staffIdSet = new Set((staff ?? []).map(s => s.id))
  const staffServices: Record<string, string[]> = {}
  for (const l of svcLinks ?? []) if (staffIdSet.has(l.staff_id)) (staffServices[l.staff_id] ??= []).push(l.service_id)

  // Auto-sincroniza staff_roles con lo que el staff ya trae en role — cubre
  // datos de antes de este feature (roles escritos como texto libre, seeds,
  // importaciones) para que "Editar roles" siempre refleje la BD real.
  // Comparación case-insensitive: evita crear un tag "fantasma" duplicado
  // cuando solo difiere en mayúsculas/minúsculas de uno ya existente
  // (ej. staff.role = "Dueño" vs. staff_roles.label = "dueño").
  const knownLabelsLower = new Set((existingRoleTags ?? []).map(t => t.label.toLowerCase()))
  const missingLabels = Array.from(
    new Set(
      (staff ?? [])
        .map(s => s.role)
        .filter((r): r is string => !!r && !knownLabelsLower.has(r.toLowerCase()))
    )
  )

  let roleTags = existingRoleTags ?? []
  if (missingLabels.length > 0) {
    await service
      .from('staff_roles')
      .upsert(
        missingLabels.map(label => ({ organization_id: organization.id, label })),
        { onConflict: 'organization_id,label', ignoreDuplicates: true }
      )
    const { data: refreshed } = await service
      .from('staff_roles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('label', { ascending: true })
    roleTags = refreshed ?? roleTags
  }

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
        services={(svcList ?? []).map(s => ({ id: s.id, name: s.name, is_active: s.is_active }))}
        staffServices={staffServices}
      />
    </div>
  )
}
