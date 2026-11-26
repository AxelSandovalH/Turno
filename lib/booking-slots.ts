import { addMinutes, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'
import { staffCanDo, serviceWindow, clampToWindow } from '@/lib/staff-services'
import type { createServiceClient } from '@/lib/supabase/service'

const SLOT_INTERVAL = 30

/**
 * Horarios libres (HH:mm, hora del negocio) de UNA persona para un servicio en un día: respeta su horario, sus citas,
 * los bloqueos y, si viene, la hora límite de entrega.
 */
export async function staffSlots(db: ReturnType<typeof createServiceClient>, a: { organizationId: string; timezone: string; staffId: string; serviceId: string; duration: number; date: string; deadline?: string }): Promise<string[]> {
  if (!(await staffCanDo(db, a.staffId, a.serviceId))) return []

  const tz = a.timezone
  const localStart = fromZonedTime(`${a.date}T00:00:00`, tz)
  const localEnd = fromZonedTime(`${a.date}T23:59:59`, tz)
  const dayOfWeek = toZonedTime(localStart, tz).getDay()

  const [{ data: schedules }, { data: existing }, { data: blocks }] = await Promise.all([
    db.from('staff_schedules')
      .select('start_time, end_time')
      .eq('staff_id', a.staffId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_working', true),
    db.from('appointments')
      .select('starts_at, ends_at')
      .eq('staff_id', a.staffId)
      .eq('status', 'confirmed')
      .gte('starts_at', localStart.toISOString())
      .lte('starts_at', localEnd.toISOString()),
    db.from('time_blocks')
      .select('starts_at, ends_at')
      .eq('organization_id', a.organizationId)
      .or(`staff_id.eq.${a.staffId},staff_id.is.null`)
      .lte('starts_at', localEnd.toISOString())
      .gte('ends_at', localStart.toISOString()),
  ])

  if (!schedules || schedules.length === 0) return []

  const slots: string[] = []
  const now = new Date()
  const win = await serviceWindow(db, a.staffId, a.serviceId)
  const limit = a.deadline && /^\d{2}:\d{2}$/.test(a.deadline) ? fromZonedTime(`${a.date}T${a.deadline}:00`, tz) : null

  // Un staff puede tener varios bloques el mismo día (ej. horario partido:
  // mañana y tarde) — cada fila de staff_schedules es un bloque independiente.
  for (const schedule of schedules) {
    // Postgres time comes as "09:00:00" — normalize to HH:mm
    const clamped = clampToWindow(schedule.start_time.slice(0, 5), schedule.end_time.slice(0, 5), win)
    if (!clamped) continue
    const workStart = fromZonedTime(`${a.date}T${clamped.start}:00`, tz)
    const workEnd = fromZonedTime(`${a.date}T${clamped.end}:00`, tz)

    let cursor = workStart
    while (cursor < workEnd) {
      const slotEnd = addMinutes(cursor, a.duration)
      if (slotEnd > workEnd) break

      const isBooked = (existing ?? []).some(x => cursor < parseISO(x.ends_at) && slotEnd > parseISO(x.starts_at))
      const isBlocked = (blocks ?? []).some(b => cursor < parseISO(b.ends_at) && slotEnd > parseISO(b.starts_at))

      if (!isBooked && !isBlocked && !(limit && slotEnd > limit) && cursor > now) {
        slots.push(format(toZonedTime(cursor, tz), 'HH:mm', { timeZone: tz }))
      }
      cursor = addMinutes(cursor, SLOT_INTERVAL)
    }
  }

  return slots.sort()
}
