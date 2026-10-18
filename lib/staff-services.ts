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

/** Ventana horaria propia del servicio para este profesional ("HH:mm"), o null si sigue todo su horario. */
export async function serviceWindow(db: SupabaseClient, staffId: string, serviceId: string): Promise<{ start: string; end: string } | null> {
  const { data } = await db.from('staff_services').select('window_start, window_end').eq('staff_id', staffId).eq('service_id', serviceId).maybeSingle()
  if (!data?.window_start && !data?.window_end) return null
  return { start: (data.window_start ?? '00:00').slice(0, 5), end: (data.window_end ?? '23:59').slice(0, 5) }
}

/** Recorta un bloque de horario ("HH:mm") a la ventana del servicio. Devuelve null si no queda nada. */
export function clampToWindow(start: string, end: string, win: { start: string; end: string } | null): { start: string; end: string } | null {
  if (!win) return { start, end }
  const s = start > win.start ? start : win.start
  const e = end < win.end ? end : win.end
  return s < e ? { start: s, end: e } : null
}
