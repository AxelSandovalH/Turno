/**
 * Puebla el dashboard demo con clientes, citas, pagos y notas realistas.
 * Run: npx tsx scripts/seed-demo-data.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function daysAgo(n: number, hour = 10, min = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}
function daysFromNow(n: number, hour = 10, min = 0) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

async function main() {
  // ── Obtener org demo ─────────────────────────────────────────────────────────
  const { data: org } = await db.from('organizations').select('*').eq('slug', 'demo-turno').single()
  if (!org) { console.error('Org demo no encontrada. Corre seed-demo.ts primero.'); process.exit(1) }
  console.log(`\nOrg: ${org.name} (${org.id})\n`)

  const { data: staffList } = await db.from('staff').select('*').eq('organization_id', org.id).eq('is_active', true).neq('user_id', null).order('created_at')
  const { data: allStaff }  = await db.from('staff').select('*').eq('organization_id', org.id).eq('is_active', true)
  const { data: services }  = await db.from('services').select('*').eq('organization_id', org.id).eq('is_active', true)

  // Usar los barberos (no el owner)
  const barbers = (allStaff ?? []).filter(s => s.role === 'staff')
  const carlos  = barbers[0]
  const miguel  = barbers[1]

  const sCorte      = services?.find(s => s.name === 'Corte clásico')
  const sCorteBarba = services?.find(s => s.name === 'Corte + Barba')
  const sBarba      = services?.find(s => s.name === 'Barba')
  const sInfantil   = services?.find(s => s.name === 'Corte infantil')

  if (!carlos || !miguel || !sCorte) {
    console.error('Faltan barberos o servicios. Corre seed-demo.ts primero.')
    process.exit(1)
  }

  // ── Clientes ─────────────────────────────────────────────────────────────────
  console.log('Creando clientes...')
  const { data: customers } = await db.from('customers').insert([
    { organization_id: org.id, name: 'Rodrigo Hernández', phone: '5215512345601', notes: 'Le gusta el degradado alto' },
    { organization_id: org.id, name: 'Andrés Martínez',  phone: '5215512345602', notes: 'Corte clásico siempre' },
    { organization_id: org.id, name: 'Fernando Castro',  phone: '5215512345603' },
    { organization_id: org.id, name: 'Daniel López',     phone: '5215512345604', notes: 'Trae a su hijo los sábados' },
    { organization_id: org.id, name: 'Carlos Jiménez',   phone: '5215512345605' },
    { organization_id: org.id, name: 'Miguel Ángel Ruiz',phone: '5215512345606', notes: 'Alergia a la espuma' },
    { organization_id: org.id, name: 'Luis Moreno',      phone: '5215512345607' },
    { organization_id: org.id, name: 'Jorge Ramírez',    phone: '5215512345608', notes: 'Pago siempre con transferencia' },
    { organization_id: org.id, name: 'Sebastián Torres', phone: '5215512345609' },
    { organization_id: org.id, name: 'Kevin Sánchez',    phone: '5215512345610' },
  ]).select()

  if (!customers) { console.error('Error creando clientes'); process.exit(1) }
  console.log(`  ✓ ${customers.length} clientes`)

  const [rodrigo, andres, fernando, daniel, carlosC, miguelR, luis, jorge, sebastian, kevin] = customers

  // ── Citas pasadas (completadas) ──────────────────────────────────────────────
  console.log('Creando citas...')

  const pastAppointments = [
    // Hace 30 días
    { customer_id: rodrigo.id,   staff_id: carlos.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(30, 10, 0),  ends_at: daysAgo(30, 10, 50), status: 'completed' },
    { customer_id: andres.id,    staff_id: miguel.id,  service_id: sCorte!.id,      starts_at: daysAgo(30, 11, 0),  ends_at: daysAgo(30, 11, 30), status: 'completed' },
    { customer_id: fernando.id,  staff_id: carlos.id,  service_id: sBarba!.id,      starts_at: daysAgo(30, 12, 0),  ends_at: daysAgo(30, 12, 25), status: 'completed' },
    // Hace 25 días
    { customer_id: daniel.id,    staff_id: miguel.id,  service_id: sInfantil!.id,   starts_at: daysAgo(25, 10, 30), ends_at: daysAgo(25, 10, 55), status: 'completed' },
    { customer_id: carlosC.id,   staff_id: carlos.id,  service_id: sCorte!.id,      starts_at: daysAgo(25, 11, 0),  ends_at: daysAgo(25, 11, 30), status: 'completed' },
    // Hace 20 días
    { customer_id: miguelR.id,   staff_id: miguel.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(20, 10, 0),  ends_at: daysAgo(20, 10, 50), status: 'completed' },
    { customer_id: rodrigo.id,   staff_id: carlos.id,  service_id: sBarba!.id,      starts_at: daysAgo(20, 12, 0),  ends_at: daysAgo(20, 12, 25), status: 'completed' },
    { customer_id: luis.id,      staff_id: carlos.id,  service_id: sCorte!.id,      starts_at: daysAgo(20, 14, 0),  ends_at: daysAgo(20, 14, 30), status: 'cancelled' },
    // Hace 15 días
    { customer_id: jorge.id,     staff_id: miguel.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(15, 10, 0),  ends_at: daysAgo(15, 10, 50), status: 'completed' },
    { customer_id: sebastian.id, staff_id: carlos.id,  service_id: sCorte!.id,      starts_at: daysAgo(15, 11, 30), ends_at: daysAgo(15, 12, 0),  status: 'completed' },
    { customer_id: andres.id,    staff_id: miguel.id,  service_id: sCorte!.id,      starts_at: daysAgo(15, 13, 0),  ends_at: daysAgo(15, 13, 30), status: 'no_show'   },
    // Hace 10 días
    { customer_id: kevin.id,     staff_id: carlos.id,  service_id: sCorte!.id,      starts_at: daysAgo(10, 10, 0),  ends_at: daysAgo(10, 10, 30), status: 'completed' },
    { customer_id: fernando.id,  staff_id: miguel.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(10, 11, 0),  ends_at: daysAgo(10, 11, 50), status: 'completed' },
    { customer_id: rodrigo.id,   staff_id: carlos.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(10, 14, 0),  ends_at: daysAgo(10, 14, 50), status: 'completed' },
    // Hace 5 días
    { customer_id: carlosC.id,   staff_id: miguel.id,  service_id: sCorte!.id,      starts_at: daysAgo(5, 10, 0),   ends_at: daysAgo(5, 10, 30),  status: 'completed' },
    { customer_id: daniel.id,    staff_id: carlos.id,  service_id: sInfantil!.id,   starts_at: daysAgo(5, 12, 0),   ends_at: daysAgo(5, 12, 25),  status: 'completed' },
    { customer_id: jorge.id,     staff_id: miguel.id,  service_id: sBarba!.id,       starts_at: daysAgo(5, 15, 0),   ends_at: daysAgo(5, 15, 25),  status: 'completed' },
    // Ayer
    { customer_id: andres.id,    staff_id: carlos.id,  service_id: sCorteBarba!.id, starts_at: daysAgo(1, 11, 0),   ends_at: daysAgo(1, 11, 50),  status: 'completed' },
    { customer_id: miguelR.id,   staff_id: miguel.id,  service_id: sCorte!.id,      starts_at: daysAgo(1, 13, 30),  ends_at: daysAgo(1, 14, 0),   status: 'completed' },
  ].map(a => ({ ...a, organization_id: org.id }))

  // Citas futuras (confirmadas)
  const futureAppointments = [
    // Hoy
    { customer_id: sebastian.id, staff_id: carlos.id, service_id: sCorte!.id,      starts_at: daysFromNow(0, 11, 0),  ends_at: daysFromNow(0, 11, 30), status: 'confirmed' },
    { customer_id: luis.id,      staff_id: miguel.id, service_id: sCorteBarba!.id, starts_at: daysFromNow(0, 12, 0),  ends_at: daysFromNow(0, 12, 50), status: 'confirmed' },
    { customer_id: kevin.id,     staff_id: carlos.id, service_id: sBarba!.id,      starts_at: daysFromNow(0, 15, 0),  ends_at: daysFromNow(0, 15, 25), status: 'confirmed' },
    // Mañana
    { customer_id: rodrigo.id,   staff_id: carlos.id, service_id: sCorteBarba!.id, starts_at: daysFromNow(1, 10, 0),  ends_at: daysFromNow(1, 10, 50), status: 'confirmed' },
    { customer_id: andres.id,    staff_id: miguel.id, service_id: sCorte!.id,      starts_at: daysFromNow(1, 11, 30), ends_at: daysFromNow(1, 12, 0),  status: 'confirmed' },
    { customer_id: jorge.id,     staff_id: carlos.id, service_id: sBarba!.id,      starts_at: daysFromNow(1, 14, 0),  ends_at: daysFromNow(1, 14, 25), status: 'confirmed' },
    // Esta semana
    { customer_id: fernando.id,  staff_id: miguel.id, service_id: sCorteBarba!.id, starts_at: daysFromNow(3, 10, 0),  ends_at: daysFromNow(3, 10, 50), status: 'confirmed' },
    { customer_id: daniel.id,    staff_id: carlos.id, service_id: sInfantil!.id,   starts_at: daysFromNow(3, 12, 0),  ends_at: daysFromNow(3, 12, 25), status: 'confirmed' },
    { customer_id: carlosC.id,   staff_id: miguel.id, service_id: sCorte!.id,      starts_at: daysFromNow(5, 11, 0),  ends_at: daysFromNow(5, 11, 30), status: 'confirmed' },
    { customer_id: miguelR.id,   staff_id: carlos.id, service_id: sCorteBarba!.id, starts_at: daysFromNow(5, 14, 0),  ends_at: daysFromNow(5, 14, 50), status: 'confirmed' },
    // Próxima semana
    { customer_id: sebastian.id, staff_id: miguel.id, service_id: sCorte!.id,      starts_at: daysFromNow(8, 10, 0),  ends_at: daysFromNow(8, 10, 30), status: 'confirmed' },
    { customer_id: kevin.id,     staff_id: carlos.id, service_id: sCorte!.id,      starts_at: daysFromNow(10, 11, 0), ends_at: daysFromNow(10, 11, 30), status: 'confirmed' },
  ].map(a => ({ ...a, organization_id: org.id }))

  const { data: createdAppts } = await db
    .from('appointments')
    .insert([...pastAppointments, ...futureAppointments])
    .select()

  if (!createdAppts) { console.error('Error creando citas'); process.exit(1) }
  console.log(`  ✓ ${createdAppts.length} citas`)

  // ── Pagos (solo citas completadas) ──────────────────────────────────────────
  console.log('Creando pagos...')

  const completedAppts = createdAppts.filter(a => a.status === 'completed')
  const methods = ['cash', 'cash', 'cash', 'transfer', 'card'] // mayoría efectivo

  const getPrice = (serviceId: string) =>
    services?.find(s => s.id === serviceId)?.price ?? 150

  const payments = completedAppts.map((a, i) => ({
    organization_id: org.id,
    customer_id: a.customer_id,
    appointment_id: a.id,
    staff_id: a.staff_id,
    amount: getPrice(a.service_id),
    currency: 'MXN',
    method: methods[i % methods.length],
    status: 'paid',
    concept: `Sesión ${new Date(a.starts_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`,
    paid_at: a.ends_at,
  }))

  await db.from('payments').insert(payments)
  console.log(`  ✓ ${payments.length} pagos registrados`)

  // ── Totales ──────────────────────────────────────────────────────────────────
  const totalIngresos = payments.reduce((s, p) => s + Number(p.amount), 0)
  console.log(`\n✅ Demo listo.\n`)
  console.log(`  Clientes:  ${customers.length}`)
  console.log(`  Citas:     ${createdAppts.length} (${completedAppts.length} completadas, ${futureAppointments.length} futuras)`)
  console.log(`  Ingresos:  $${totalIngresos.toLocaleString('es-MX')} MXN simulados`)
}

main().catch(console.error)
