import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ¿Este profesional puede hacer este servicio? Sin asignaciones configuradas puede hacer todos;
 * con asignaciones, solo los marcados.
 */
export async function staffCanDo(db: SupabaseClient, staffId: string, serviceId: string): Promise<boolean> {
  const { data } = await db.from('staff_services').select('service_id').eq('staff_id', staffId)
  const rows = data ?? []
  return rows.length === 0 || rows.some(r => r.service_id === serviceId)
}

/** Deja solo los profesionales que pueden hacer el servicio (mismas reglas que staffCanDo). */
export async function filterStaffForService<T extends { id: string }>(db: SupabaseClient, staff: T[], serviceId: string): Promise<T[]> {
  if (!staff.length) return staff
  const { data } = await db.from('staff_services').select('staff_id, service_id').in('staff_id', staff.map(s => s.id))
  const byStaff = new Map<string, Set<string>>()
  for (const r of data ?? []) byStaff.set(r.staff_id, (byStaff.get(r.staff_id) ?? new Set()).add(r.service_id))
  return staff.filter(s => !byStaff.has(s.id) || byStaff.get(s.id)!.has(serviceId))
}
