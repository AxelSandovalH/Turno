/**
 * Datos de prueba para el tenant existente "Barber Shop CS" — sucursal,
 * servicios, barberos, clientes, citas (pasadas/hoy/futuras con distintos
 * estados) y pagos, para poder probar el flujo completo del dashboard.
 *
 * A diferencia de seed-piedicarino.ts, esta org YA existe (fue creada por
 * el usuario vía registro/onboarding) — el script solo la completa con
 * datos, no crea la organización ni el usuario de login.
 *
 * Run: npx tsx scripts/seed-barbershop-cs.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ORG_ID = '97a0152c-aa27-4c2e-a2a6-42d3a9979a18' // Barber Shop CS

async function main() {
  console.log('\n=== Barber Shop CS — datos de prueba ===\n')

  const { data: org, error } = await service.from('organizations').select('*').eq('id', ORG_ID).single()
  if (error || !org) { console.error('No se encontró la organización:', error?.message); process.exit(1) }
  console.log(`  ✓ Org: "${org.name}" (${org.id})`)

  const branchId = await seedBranch(org.id)
  const services = await seedServices(org.id)
  const staff = await seedStaff(org.id)
  await seedSchedules(staff)
  const customers = await seedCustomers(org.id)
  const appointments = await seedAppointments(org.id, branchId, staff, services, customers)
  await seedPayments(org.id, appointments, staff)

  console.log('\n✅ Listo. Entra al dashboard de Barber Shop CS para verlo.\n')
}

async function seedBranch(orgId: string): Promise<string> {
  const { data: existing } = await service.from('branches').select('id').eq('organization_id', orgId).limit(1).maybeSingle()
  if (existing) return existing.id
  const { data } = await service.from('branches').insert({ organization_id: orgId, name: 'Sucursal Centro' }).select().single()
  console.log(`  ✓ Sucursal creada`)
  return data!.id
}

async function seedServices(orgId: string) {
  const { data: existing } = await service.from('services').select('*').eq('organization_id', orgId)
  if (existing && existing.length > 0) { console.log(`  ↳ Ya hay ${existing.length} servicios, se conservan`); return existing }

  const { data } = await service.from('services').insert([
    { organization_id: orgId, name: 'Corte clásico',        duration_minutes: 30, price: 150, is_active: true },
    { organization_id: orgId, name: 'Corte + barba',        duration_minutes: 45, price: 220, is_active: true },
    { organization_id: orgId, name: 'Arreglo de barba',     duration_minutes: 20, price: 100, is_active: true },
    { organization_id: orgId, name: 'Afeitado tradicional', duration_minutes: 30, price: 180, is_active: true },
    { organization_id: orgId, name: 'Corte niño',           duration_minutes: 25, price: 120, is_active: true },
    { organization_id: orgId, name: 'Diseño / línea',       duration_minutes: 15, price: 80,  is_active: true },
  ]).select()

  console.log(`  ✓ ${data?.length ?? 0} servicios`)
  return data ?? []
}

async function seedStaff(orgId: string) {
  const { data: existing } = await service.from('staff').select('*').eq('organization_id', orgId)
  const names = existing?.map(s => s.name) ?? []

  const toAdd = [
    { organization_id: orgId, name: 'Rodrigo Álvarez', role: 'Barbero', is_active: true, specialty: 'Fades y diseños' },
    { organization_id: orgId, name: 'Diego Castañeda',  role: 'Barbero', is_active: true, specialty: 'Barba y afeitado clásico' },
  ].filter(s => !names.includes(s.name))

  let added: any[] = []
  if (toAdd.length > 0) {
    const { data } = await service.from('staff').insert(toAdd).select()
    added = data ?? []

    const labels = new Set((await service.from('staff_roles').select('label').eq('organization_id', orgId)).data?.map(r => r.label) ?? [])
    const newLabels = [...new Set(toAdd.map(s => s.role))].filter(l => !labels.has(l))
    if (newLabels.length > 0) {
      await service.from('staff_roles').insert(newLabels.map(label => ({ organization_id: orgId, label })))
    }
  }

  const all = [...(existing ?? []), ...added]
  console.log(`  ✓ ${all.length} integrantes de staff (${added.length} nuevos)`)
  return all
}

async function seedSchedules(staff: { id: string }[]) {
  for (const s of staff) {
    const { count } = await service.from('staff_schedules').select('*', { count: 'exact', head: true }).eq('staff_id', s.id)
    if (count && count > 0) continue
    // Martes a domingo 10:00–20:00 (barbería cerrada los lunes)
    await service.from('staff_schedules').insert(
      [2, 3, 4, 5, 6, 0].map(d => ({
        staff_id: s.id, day_of_week: d, start_time: '10:00', end_time: '20:00', is_working: true,
      }))
    )
  }
  console.log(`  ✓ Horarios asignados`)
}

const NAMES = [
  'Luis Fernando Torres', 'Emiliano Cortés', 'Santiago Rangel', 'Mateo Villareal',
  'Diego Armando Solís', 'Bruno Escamilla', 'Iker Montenegro', 'Rodrigo Ibáñez',
  'Nicolás Peña', 'Sebastián Concha', 'Adrián Bautista', 'Joaquín Miramontes',
]

async function seedCustomers(orgId: string) {
  const { data: existing } = await service.from('customers').select('*').eq('organization_id', orgId)
  if (existing && existing.length > 0) { console.log(`  ↳ Ya hay ${existing.length} clientes, se conservan`); return existing }

  const { data } = await service.from('customers').insert(
    NAMES.map((name, i) => ({
      organization_id: orgId,
      name,
      phone: `52314${String(1000000 + i * 53).slice(0, 7)}`,
      is_active: true,
    }))
  ).select()

  console.log(`  ✓ ${data?.length ?? 0} clientes`)
  return data ?? []
}

async function seedAppointments(
  orgId: string,
  branchId: string,
  staff: { id: string }[],
  servicesList: { id: string; duration_minutes: number }[],
  customers: { id: string }[],
) {
  if (!staff.length || !servicesList.length || !customers.length) {
    console.log('  ⚠ Faltan staff/servicios/clientes, se omiten citas')
    return []
  }

  const { count } = await service.from('appointments').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (count && count > 0) { console.log(`  ↳ Ya hay ${count} citas, se conservan (no se agregan más)`); return [] }

  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const rows: Record<string, unknown>[] = []

  // Citas repartidas de -10 a +7 días, 10:00–19:30, barbería cerrada lunes
  for (let dayOffset = -10; dayOffset <= 7; dayOffset++) {
    const day = new Date()
    day.setDate(day.getDate() + dayOffset)
    if (day.getDay() === 1) continue // lunes cerrado

    const perDay = 3 + Math.floor(Math.random() * 4) // 3–6 citas/día
    for (let k = 0; k < perDay; k++) {
      const svc = rnd(servicesList)
      const start = new Date(day)
      start.setHours(10 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0)
      const end = new Date(start.getTime() + svc.duration_minutes * 60000)

      let status: string
      let confirmation: string | null
      if (dayOffset < 0) {
        const roll = Math.random()
        status = roll < 0.78 ? 'completed' : roll < 0.92 ? 'no_show' : 'cancelled'
        confirmation = status === 'completed' ? 'confirmed' : status === 'cancelled' ? 'declined' : 'confirmed'
      } else if (dayOffset === 0) {
        status = 'confirmed'
        confirmation = Math.random() < 0.6 ? 'confirmed' : Math.random() < 0.5 ? 'pending' : 'risk'
      } else {
        status = 'confirmed'
        confirmation = Math.random() < 0.4 ? 'confirmed' : 'pending'
      }

      rows.push({
        organization_id: orgId,
        branch_id: branchId,
        customer_id: rnd(customers).id,
        staff_id: rnd(staff).id,
        service_id: svc.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status,
        confirmation_status: confirmation,
      })
    }
  }

  const { data } = await service.from('appointments').insert(rows).select()
  console.log(`  ✓ ${data?.length ?? 0} citas`)
  return data ?? []
}

async function seedPayments(orgId: string, appointments: any[], staff: { id: string }[]) {
  const completed = appointments.filter(a => a.status === 'completed')
  if (completed.length === 0) { console.log('  ↳ Sin citas completadas, se omiten pagos'); return }

  const { count } = await service.from('payments').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
  if (count && count > 0) { console.log(`  ↳ Ya hay ${count} pagos, se conservan`); return }

  // Trae los servicios para poder registrar el monto/concepto reales
  const { data: servicesList } = await service.from('services').select('id, name, price').eq('organization_id', orgId)
  const svcMap = new Map((servicesList ?? []).map(s => [s.id, s]))

  const methods = ['cash', 'card', 'transfer']
  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

  const rows = completed.map(a => {
    const svc = svcMap.get(a.service_id)
    return {
      organization_id: orgId,
      customer_id: a.customer_id,
      appointment_id: a.id,
      staff_id: a.staff_id,
      amount: svc?.price ?? 150,
      currency: 'MXN',
      method: rnd(methods),
      status: 'paid',
      concept: svc?.name ?? 'Servicio',
      paid_at: a.ends_at,
    }
  })

  const { data } = await service.from('payments').insert(rows).select()
  console.log(`  ✓ ${data?.length ?? 0} pagos`)
}

main().catch(console.error)
