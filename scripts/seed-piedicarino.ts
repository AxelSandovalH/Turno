/**
 * Demo pre-cargada para Piedi Carino Beauty & Spa (Cabo San Lucas).
 * Crea la organización, un usuario de demo, servicios de spa, estilistas,
 * clientes y citas repartidas en el calendario para que se vea un negocio real.
 *
 * Run: npx tsx scripts/seed-piedicarino.ts
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

const SLUG = 'piedi-carino'
const DEMO_EMAIL = 'piedicarino.demo@quickturno.app'
const DEMO_PASSWORD = 'PiediCarino2026!'

async function main() {
  console.log('\n=== Piedi Carino Beauty & Spa — demo ===\n')

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .insert({
      name: 'Piedi Carino Beauty & Spa',
      slug: SLUG,
      business_type: 'barbershop', // modo no-médico → "Clientes"
      whatsapp_number: '526241050423',
      phone: '6241050423',
      email: 'demo@quickturno.app',
      address: 'Blvd. Lázaro Cárdenas S/N, Puerto Paraíso Local 37, Centro, Cabo San Lucas, B.C.S.',
      timezone: 'America/Mazatlan', // BCS
      subscription_status: 'active',
      welcome_message: '¡Hola! 💅 Bienvenido a Piedi Carino Beauty & Spa. ¿En qué servicio te puedo ayudar hoy?',
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

  await service.from('branches').insert({ organization_id: org.id, name: 'Puerto Paraíso' })

  const { staff, services } = await seedCatalog(org.id)
  await seedCustomersAndAppointments(org.id, staff, services)
  await seedUser(org)
}

async function seedCatalog(orgId: string) {
  console.log('  Poblando servicios y estilistas...')

  const { data: services } = await service.from('services').insert([
    { organization_id: orgId, name: 'Manicure',            duration_minutes: 45, price: 350, is_active: true },
    { organization_id: orgId, name: 'Pedicure spa',        duration_minutes: 60, price: 450, is_active: true },
    { organization_id: orgId, name: 'Uñas acrílicas',      duration_minutes: 90, price: 650, is_active: true },
    { organization_id: orgId, name: 'Facial hidratante',   duration_minutes: 60, price: 700, is_active: true },
    { organization_id: orgId, name: 'Masaje relajante',    duration_minutes: 60, price: 850, is_active: true },
    { organization_id: orgId, name: 'Corte y peinado',     duration_minutes: 50, price: 400, is_active: true },
  ]).select()

  const { data: staff } = await service.from('staff').insert([
    { organization_id: orgId, name: 'Valeria Núñez',  role: 'Dueño', is_owner: true, is_active: true, specialty: 'Uñas y manicure' },
    { organization_id: orgId, name: 'Daniela Ruiz',   role: 'Staff', is_active: true, specialty: 'Faciales y masaje' },
    { organization_id: orgId, name: 'Sofía Herrera',  role: 'Staff', is_active: true, specialty: 'Cabello' },
  ]).select()

  // Horarios: lunes a sábado 10:00–20:00 (spa cierra a las 8pm)
  if (staff) {
    for (const s of staff) {
      await service.from('staff_schedules').insert(
        [1, 2, 3, 4, 5, 6].map(d => ({
          staff_id: s.id, day_of_week: d, start_time: '10:00', end_time: '20:00', is_working: true,
        }))
      )
    }
  }

  console.log(`  ✓ ${services?.length ?? 0} servicios, ${staff?.length ?? 0} estilistas`)
  return { staff: staff ?? [], services: services ?? [] }
}

const NAMES = [
  'María Fernanda López', 'Regina Castro', 'Ana Sofía Morales', 'Paulina Vega',
  'Gabriela Ríos', 'Andrea Salinas', 'Ximena Ortega', 'Carmen Delgado',
  'Fernanda Guzmán', 'Lucía Mendoza', 'Renata Flores', 'Isabela Cruz',
]

async function seedCustomersAndAppointments(
  orgId: string,
  staff: { id: string }[],
  services: { id: string; duration_minutes: number }[],
) {
  console.log('  Creando clientes y citas...')

  const { data: customers } = await service.from('customers').insert(
    NAMES.map((name, i) => ({
      organization_id: orgId,
      name,
      phone: `52624${String(1000000 + i * 37).slice(0, 7)}`,
      is_active: true,
    }))
  ).select()

  if (!customers || !staff.length || !services.length) return

  const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
  const rows: Record<string, unknown>[] = []

  // Citas repartidas de -14 a +10 días, 10:00–19:00
  for (let dayOffset = -14; dayOffset <= 10; dayOffset++) {
    const perDay = 2 + Math.floor(Math.random() * 3) // 2–4 citas/día
    for (let k = 0; k < perDay; k++) {
      const svc = rnd(services)
      const start = new Date()
      start.setDate(start.getDate() + dayOffset)
      start.setHours(10 + Math.floor(Math.random() * 8), Math.random() < 0.5 ? 0 : 30, 0, 0)
      const end = new Date(start.getTime() + svc.duration_minutes * 60000)

      let status: string, confirmation: string
      if (dayOffset < 0) {
        status = Math.random() < 0.85 ? 'completed' : 'no_show'
        confirmation = 'confirmed'
      } else if (dayOffset === 0) {
        status = 'confirmed'; confirmation = 'confirmed'
      } else {
        status = 'confirmed'; confirmation = Math.random() < 0.5 ? 'confirmed' : 'pending'
      }

      rows.push({
        organization_id: orgId,
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

  await service.from('appointments').insert(rows)
  console.log(`  ✓ ${customers.length} clientes, ${rows.length} citas`)
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

  const { data: existingStaff } = await service
    .from('staff').select('id').eq('user_id', userId).eq('organization_id', org.id).maybeSingle()
  if (!existingStaff) {
    await service.from('staff').insert({
      organization_id: org.id, user_id: userId, name: 'Valeria Núñez', role: 'Dueño', is_owner: true, is_active: true,
    })
  }

  console.log(`\n✅ Listo para la demo.\n`)
  console.log(`  URL:        https://www.quickturno.app/login`)
  console.log(`  Email:      ${DEMO_EMAIL}`)
  console.log(`  Contraseña: ${DEMO_PASSWORD}`)
  console.log(`  Página de reservas: https://www.quickturno.app/book/${SLUG}\n`)
}

main().catch(console.error)
