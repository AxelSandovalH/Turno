import { NextResponse } from 'next/server'
import { staffSlots } from '@/lib/booking-slots'
import { hasCapability } from '@/lib/profiles/registry'
import { createServiceClient } from '@/lib/supabase/service'

// Public endpoint for the booking page: returns available slot labels (HH:mm)
// for a given org/staff/service/date. Server-side so RLS stays closed and
// appointment data never reaches the browser.

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  const staffId = url.searchParams.get('staff') ?? ''
  const serviceId = url.searchParams.get('service') ?? ''
  const date = url.searchParams.get('date') ?? '' // YYYY-MM-DD
  const deadline = url.searchParams.get('deadline') ?? '' // HH:mm, opcional: el servicio debe terminar antes

  if (!slug || !staffId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, timezone, business_type')
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

  // 'any' (solo limpieza): junta los horarios de todo el equipo
  let staffIds = [staffId]
  if (staffId === 'any') {
    if (!hasCapability(org.business_type, 'properties')) return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    const { data: team } = await db.from('staff').select('id').eq('organization_id', org.id).eq('is_active', true)
    staffIds = (team ?? []).map(s => s.id)
  }

  const perStaff = await Promise.all(staffIds.map(id => staffSlots(db, { organizationId: org.id, timezone: org.timezone, staffId: id, serviceId, duration: service.duration_minutes, date, deadline })))
  const slots = [...new Set(perStaff.flat())].sort()
  return NextResponse.json({ slots })
}
