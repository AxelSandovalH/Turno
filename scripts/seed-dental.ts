/**
 * Demo pre-cargada para un consultorio dental ("Sonrisa Dental CDMX").
 * Crea la organización, un usuario de demo, servicios, dentistas,
 * pacientes, citas repartidas en el calendario y notas clínicas SOAP,
 * para poder probar el flujo completo del perfil Odontología.
 *
 * Run: npx tsx scripts/seed-dental.ts
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

const SLUG = 'sonrisa-dental'
const DEMO_EMAIL = 'dental.demo@quickturno.app'
const DEMO_PASSWORD = 'DentalDemo2026!'

async function main() {
  console.log('\n=== Sonrisa Dental CDMX — demo ===\n')

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .insert({
      name: 'Sonrisa Dental CDMX',
      slug: SLUG,
      business_type: 'dentistry',
      whatsapp_number: '525587001234',
      phone: '5587001234',
      email: 'contacto@sonrisadental.mx',
      address: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
      timezone: 'America/Mexico_City',
      subscription_status: 'active',
      welcome_message: '¡Hola! 🦷 Bienvenido a Sonrisa Dental. ¿En qué te podemos ayudar hoy?',
    })
    .select()
    .single()

  if (orgErr) {
    if (orgErr.code === '23505') {
      console.log('  ↳ Org demo ya existe. Elimínala en Supabase si quieres regenerarla desde cero.')
      const { data: existing } = await service.from('organizations').select('*').eq('slug', SLUG).single()
      if (existing) await seedUser(existing)
      return
    }
    console.error('Error creando org:', orgErr.message)
    process.exit(1)
  }

  console.log(`  ✓ Org creada: "${org.name}" (${org.id})`)

  const { data: branch } = await service.from('branches').insert({ organization_id: org.id, name: 'Del Valle' }).select().single()

  const { staff, services } = await seedCatalog(org.id)
  const { appointments } = await seedCustomersAndAppointments(org.id, branch!.id, staff, services)
  await seedPayments(org.id, appointments, services)
  await seedNotes(org.id, appointments, staff)
  await seedUser(org)
}

async function seedCatalog(orgId: string) {
  console.log('  Poblando servicios y dentistas...')

  const { data: services } = await service.from('services').insert([
    { organization_id: orgId, name: 'Consulta y diagnóstico', duration_minutes: 30, price: 400,  is_active: true },
    { organization_id: orgId, name: 'Limpieza dental',        duration_minutes: 45, price: 600,  is_active: true },
    { organization_id: orgId, name: 'Resina / obturación',    duration_minutes: 60, price: 900,  is_active: true },
    { organization_id: orgId, name: 'Extracción simple',      duration_minutes: 30, price: 750,  is_active: true },
    { organization_id: orgId, name: 'Blanqueamiento dental',  duration_minutes: 60, price: 2200, is_active: true },
    { organization_id: orgId, name: 'Endodoncia',             duration_minutes: 90, price: 3500, is_active: true },
  ]).select()

  const { data: staff, error: staffErr } = await service.from('staff').insert([
    { organization_id: orgId, name: 'Dra. Renata Solís',   role: 'Dueño',    is_owner: true, is_active: true, specialty: 'Odontología general', license_number: '9871234' },
    { organization_id: orgId, name: 'Dr. Emilio Cárdenas', role: 'Dentista', is_active: true, specialty: 'Endodoncia',          license_number: '9871235' },
    { organization_id: orgId, name: 'Dra. Paola Junco',    role: 'Dentista', is_active: true, specialty: 'Estética dental',      license_number: '9871236' },
  ]).select()
  if (staffErr) console.error('  ⚠ Error creando staff:', staffErr.message)

  await service.from('staff_roles').insert([
    { organization_id: orgId, label: 'Dueño' },
    { organization_id: orgId, label: 'Dentista' },
  ])

  // Horarios: lunes a viernes 9:00–18:00, sábado 9:00–14:00
  if (staff) {
    for (const s of staff) {
      await service.from('staff_schedules').insert([
        ...[1, 2, 3, 4, 5].map(d => ({ staff_id: s.id, day_of_week: d, start_time: '09:00', end_time: '18:00', is_working: true })),
        { staff_id: s.id, day_of_week: 6, start_time: '09:00', end_time: '14:00', is_working: true },
      ])
    }
  }

  console.log(`  ✓ ${services?.length ?? 0} servicios, ${staff?.length ?? 0} dentistas`)
  return { staff: staff ?? [], services: services ?? [] }
}

const NAMES = [
  'Alejandro Ruiz Peña', 'Camila Vargas', 'Fernando Ozuna', 'Valentina Reséndiz',
  'Héctor Manuel Ibarra', 'Ximena Portillo', 'Ricardo Elizondo', 'Daniela Aguirre',
  'Jorge Luis Campuzano', 'Mariana Solórzano', 'Emilio Casas', 'Natalia Beltrán',
]

async function seedCustomersAndAppointments(
  orgId: string,
  branchId: string,
  staff: { id: string }[],
  services: { id: string; duration_minutes: number }[],
) {
  console.log('  Creando pacientes y citas...')

  const { data: customers } = await service.from('customers').insert(
    NAMES.map((name, i) => ({
      organization_id: orgId,
      name,
      phone: `52558${String(7000000 + i * 41).slice(0, 7)}`,
      is_active: true,
    }))
  ).select()

  if (!customers || !staff.length || !services.length) return { appointments: [] }

  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const rows: Record<string, unknown>[] = []

  // Citas repartidas de -12 a +8 días, 9:00–17:30, cerrado domingos
  for (let dayOffset = -12; dayOffset <= 8; dayOffset++) {
    const day = new Date()
    day.setDate(day.getDate() + dayOffset)
    if (day.getDay() === 0) continue // domingo cerrado

    const perDay = 2 + Math.floor(Math.random() * 3) // 2–4 citas/día
    for (let k = 0; k < perDay; k++) {
      const svc = rnd(services)
      const start = new Date(day)
      start.setHours(9 + Math.floor(Math.random() * 8), Math.random() < 0.5 ? 0 : 30, 0, 0)
      const end = new Date(start.getTime() + svc.duration_minutes * 60000)

      let status: string
      let confirmation: string | null
      if (dayOffset < 0) {
        const roll = Math.random()
        status = roll < 0.82 ? 'completed' : roll < 0.94 ? 'no_show' : 'cancelled'
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

  // Insert uno por uno: hay una constraint de no-solape por staff, y un
  // insert masivo aborta todo el batch si una sola fila choca.
  const appointments: any[] = []
  for (const row of rows) {
    const { data, error } = await service.from('appointments').insert(row).select().single()
    if (!error && data) appointments.push(data)
  }
  console.log(`  ✓ ${customers.length} pacientes, ${appointments.length} citas (de ${rows.length} intentadas)`)
  return { appointments }
}

async function seedPayments(orgId: string, appointments: any[], services: { id: string; price: number }[]) {
  const completed = appointments.filter(a => a.status === 'completed')
  if (completed.length === 0) return

  const svcMap = new Map((await service.from('services').select('id, name, price').eq('organization_id', orgId)).data?.map(s => [s.id, s]) ?? [])
  const methods = ['cash', 'card', 'transfer']
  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

  const rows = completed.map(a => {
    const svc: any = svcMap.get(a.service_id)
    return {
      organization_id: orgId,
      customer_id: a.customer_id,
      appointment_id: a.id,
      staff_id: a.staff_id,
      amount: svc?.price ?? 500,
      currency: 'MXN',
      method: rnd(methods),
      status: 'paid',
      concept: svc?.name ?? 'Servicio dental',
      paid_at: a.ends_at,
    }
  })

  const { data } = await service.from('payments').insert(rows).select()
  console.log(`  ✓ ${data?.length ?? 0} pagos`)
}

const SOAP_NOTES = [
  {
    soap_subjective: 'Paciente refiere sensibilidad al frío en pieza 26 desde hace una semana.',
    soap_objective: 'Caries oclusal profunda en 26, sin compromiso pulpar visible en exploración.',
    soap_assessment: 'Caries dental profunda, pulpitis reversible probable.',
    soap_plan: 'Obturación con resina compuesta, control en 2 semanas.',
  },
  {
    soap_subjective: 'Acude a limpieza de rutina, sin dolor. Refiere sangrado leve de encías al cepillarse.',
    soap_objective: 'Gingivitis leve generalizada, cálculo supragingival moderado.',
    soap_assessment: 'Gingivitis por placa bacteriana.',
    soap_plan: 'Profilaxis completa, técnica de cepillado reforzada.',
  },
  {
    soap_subjective: 'Dolor intenso pulsátil en pieza 46, se agrava por la noche.',
    soap_objective: 'Pieza 46 con caries extensa, prueba de frío exacerbada y prolongada.',
    soap_assessment: 'Pulpitis irreversible sintomática.',
    soap_plan: 'Iniciar tratamiento de conductos (endodoncia), receta analgésico.',
  },
]

async function seedNotes(orgId: string, appointments: any[], staff: { id: string }[]) {
  const completed = appointments.filter(a => a.status === 'completed')
  if (completed.length === 0 || !staff.length) return

  const sample = completed.slice(0, Math.min(8, completed.length))
  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

  const rows = sample.map(a => ({
    appointment_id: a.id,
    organization_id: orgId,
    staff_id: a.staff_id,
    note_type: 'soap',
    ...rnd(SOAP_NOTES),
  }))

  const { data } = await service.from('appointment_notes').insert(rows).select()
  console.log(`  ✓ ${data?.length ?? 0} notas clínicas`)
}

async function seedUser(org: { id: string; name: string }) {
  console.log('\n=== Usuario de demo ===\n')

  const { data: existing } = await service.auth.admin.listUsers()
  const existingUser = existing?.users.find(u => u.email === DEMO_EMAIL)

  let userId: string
  if (existingUser) {
    userId = existingUser.id
    await service.auth.admin.updateUserById(userId, { user_metadata: { organization_id: org.id } })
    console.log(`  ↳ Usuario ya existía (${userId})`)
  } else {
    const { data: newUser, error } = await service.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { organization_id: org.id },
    })
    if (error || !newUser.user) { console.error('Error:', error?.message); return }
    userId = newUser.user.id
    console.log(`  ↳ Usuario creado (${userId})`)
  }

  const { data: linkedStaff } = await service
    .from('staff').select('id').eq('user_id', userId).eq('organization_id', org.id).maybeSingle()

  if (!linkedStaff) {
    // Enlaza al dueño ya sembrado por seedCatalog (no lo dupliques con un insert nuevo)
    const { data: unlinkedOwner } = await service
      .from('staff').select('id').eq('organization_id', org.id).eq('is_owner', true).is('user_id', null).maybeSingle()
    if (unlinkedOwner) {
      await service.from('staff').update({ user_id: userId }).eq('id', unlinkedOwner.id)
    } else {
      await service.from('staff').insert({
        organization_id: org.id, user_id: userId, name: 'Dra. Renata Solís', role: 'Dueño', is_owner: true, is_active: true,
      })
    }
  }

  console.log(`\n✅ Listo para la demo.\n`)
  console.log(`  URL:        https://www.quickturno.app/login`)
  console.log(`  Email:      ${DEMO_EMAIL}`)
  console.log(`  Contraseña: ${DEMO_PASSWORD}`)
  console.log(`  Página de reservas: https://www.quickturno.app/book/${SLUG}\n`)
}

main().catch(console.error)
