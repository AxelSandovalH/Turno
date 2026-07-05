import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { addMinutes, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'

// Public endpoint for the booking page: returns available slot labels (HH:mm)
// for a given org/staff/service/date. Server-side so RLS stays closed and
// appointment data never reaches the browser.

const SLOT_INTERVAL = 30

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  const staffId = url.searchParams.get('staff') ?? ''
  const serviceId = url.searchParams.get('service') ?? ''
  const date = url.searchParams.get('date') ?? '' // YYYY-MM-DD

  if (!slug || !staffId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, timezone')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: service } = await db
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('organization_id', org.id)
    .single()
  if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

  const tz = org.timezone
  const localStart = fromZonedTime(`${date}T00:00:00`, tz)
  const localEnd = fromZonedTime(`${date}T23:59:59`, tz)
  const dayOfWeek = toZonedTime(localStart, tz).getDay()

  const [{ data: schedule }, { data: existing }, { data: blocks }] = await Promise.all([
    db.from('staff_schedules')
      .select('start_time, end_time')
      .eq('staff_id', staffId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_working', true)
      .maybeSingle(),
    db.from('appointments')
      .select('starts_at, ends_at')
      .eq('staff_id', staffId)
      .eq('status', 'confirmed')
      .gte('starts_at', localStart.toISOString())
      .lte('starts_at', localEnd.toISOString()),
    db.from('time_blocks')
      .select('starts_at, ends_at')
      .eq('organization_id', org.id)
      .or(`staff_id.eq.${staffId},staff_id.is.null`)
      .lte('starts_at', localEnd.toISOString())
      .gte('ends_at', localStart.toISOString()),
  ])

  if (!schedule) return NextResponse.json({ slots: [] })

  // Postgres time comes as "09:00:00" — normalize to HH:mm
  const startTime = schedule.start_time.slice(0, 5)
  const endTime = schedule.end_time.slice(0, 5)
  const workStart = fromZonedTime(`${date}T${startTime}:00`, tz)
  const workEnd = fromZonedTime(`${date}T${endTime}:00`, tz)

  const slots: string[] = []
  let cursor = workStart
  const now = new Date()

  while (cursor < workEnd) {
    const slotEnd = addMinutes(cursor, service.duration_minutes)
    if (slotEnd > workEnd) break

    const isBooked = (existing ?? []).some(a =>
      cursor < parseISO(a.ends_at) && slotEnd > parseISO(a.starts_at))
    const isBlocked = (blocks ?? []).some(b =>
      cursor < parseISO(b.ends_at) && slotEnd > parseISO(b.starts_at))

    if (!isBooked && !isBlocked && cursor > now) {
      slots.push(format(toZonedTime(cursor, tz), 'HH:mm', { timeZone: tz }))
    }
    cursor = addMinutes(cursor, SLOT_INTERVAL)
  }

  return NextResponse.json({ slots })
}
