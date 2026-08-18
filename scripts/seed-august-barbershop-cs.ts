/**
 * Llena todo agosto 2026 de citas para el tenant "Barber Shop CS", usando el
 * staff/servicios/clientes ya sembrados por seed-barbershop-cs.ts. Inserta
 * fila por fila (no en batch) porque appointments tiene un exclusion
 * constraint por staff/horario que aborta el insert completo si un solo
 * choque aparece dentro de un batch.
 *
 * Run: npx tsx scripts/seed-august-barbershop-cs.ts
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
const TODAY = new Date('2026-08-17T00:00:00')

const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

async function main() {
  console.log('\n=== Barber Shop CS — llenando agosto 2026 ===\n')

  const { data: branch } = await service.from('branches').select('id').eq('organization_id', ORG_ID).limit(1).maybeSingle()
  const { data: staff } = await service.from('staff').select('id').eq('organization_id', ORG_ID)
  const { data: services } = await service.from('services').select('id, name, price, duration_minutes').eq('organization_id', ORG_ID)
  const { data: customers } = await service.from('customers').select('id').eq('organization_id', ORG_ID)

  if (!branch || !staff?.length || !services?.length || !customers?.length) {
    console.error('Faltan datos base (sucursal/staff/servicios/clientes) — corre primero scripts/seed-barbershop-cs.ts')
    process.exit(1)
  }
  console.log(`  ✓ ${staff.length} staff, ${services.length} servicios, ${customers.length} clientes`)

  const { data: existing } = await service
    .from('appointments')
    .select('starts_at')
    .eq('organization_id', ORG_ID)
    .gte('starts_at', '2026-08-01T00:00:00')
    .lt('starts_at', '2026-09-01T00:00:00')

  const existingByDay = new Map<string, number>()
  for (const a of existing ?? []) {
    const day = a.starts_at.slice(0, 10)
    existingByDay.set(day, (existingByDay.get(day) ?? 0) + 1)
  }
  console.log(`  ↳ ${existing?.length ?? 0} citas ya existen en agosto`)

  let inserted = 0
  let skippedConflicts = 0

  for (let dom = 1; dom <= 31; dom++) {
    const day = new Date(2026, 7, dom) // agosto = mes 7 (0-indexed)
    if (day.getDay() === 1) continue // lunes cerrado

    const dayKey = day.toISOString().slice(0, 10)
    const already = existingByDay.get(dayKey) ?? 0
    const target = 4 + Math.floor(Math.random() * 3) // 4–6 citas/día
    const toAdd = Math.max(0, target - already)
    if (toAdd === 0) continue

    const isPast = day < TODAY
    const isToday = dayKey === TODAY.toISOString().slice(0, 10)

    for (let k = 0; k < toAdd; k++) {
      const svc = rnd(services)
      const start = new Date(day)
      start.setHours(10 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0)
      const end = new Date(start.getTime() + svc.duration_minutes * 60000)

      let status: string
      let confirmation: string | null
      if (isPast) {
        const roll = Math.random()
        status = roll < 0.78 ? 'completed' : roll < 0.92 ? 'no_show' : 'cancelled'
        confirmation = status === 'completed' ? 'confirmed' : status === 'cancelled' ? 'declined' : 'confirmed'
      } else if (isToday) {
        status = 'confirmed'
        confirmation = Math.random() < 0.6 ? 'confirmed' : Math.random() < 0.5 ? 'pending' : 'risk'
      } else {
        status = 'confirmed'
        confirmation = Math.random() < 0.4 ? 'confirmed' : 'pending'
      }

      const { error } = await service.from('appointments').insert({
        organization_id: ORG_ID,
        branch_id: branch.id,
        customer_id: rnd(customers).id,
        staff_id: rnd(staff).id,
        service_id: svc.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status,
        confirmation_status: confirmation,
      })

      if (error) {
        skippedConflicts++
      } else {
        inserted++
      }
    }
  }

  console.log(`  ✓ ${inserted} citas nuevas insertadas`)
  if (skippedConflicts) console.log(`  ↳ ${skippedConflicts} choques de horario omitidos`)

  // Pagos para las citas completadas que aún no tienen pago
  const { data: completed } = await service
    .from('appointments')
    .select('id, service_id, customer_id, staff_id, ends_at')
    .eq('organization_id', ORG_ID)
    .eq('status', 'completed')
    .gte('starts_at', '2026-08-01T00:00:00')
    .lt('starts_at', '2026-09-01T00:00:00')

  const { data: existingPayments } = await service
    .from('payments')
    .select('appointment_id')
    .eq('organization_id', ORG_ID)
  const paidIds = new Set((existingPayments ?? []).map(p => p.appointment_id))

  const unpaid = (completed ?? []).filter(a => !paidIds.has(a.id))
  if (unpaid.length > 0) {
    const svcMap = new Map(services.map(s => [s.id, s]))
    const methods = ['cash', 'card', 'transfer']
    const rows = unpaid.map(a => {
      const svc = svcMap.get(a.service_id)
      return {
        organization_id: ORG_ID,
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
    const { data: paid } = await service.from('payments').insert(rows).select()
    console.log(`  ✓ ${paid?.length ?? 0} pagos nuevos`)
  }

  console.log('\n✅ Agosto lleno. Entra al dashboard de Barber Shop CS para verlo.\n')
}

main().catch(console.error)
