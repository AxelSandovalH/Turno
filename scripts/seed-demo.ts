/**
 * Crea una organización demo + usuario demo para JL (ventas).
 * Run: npx tsx scripts/seed-demo.ts
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

async function main() {
  console.log('\n=== Creando organización demo ===\n')

  // 1. Crear org demo
  const trialEndsAt = new Date()
  trialEndsAt.setFullYear(trialEndsAt.getFullYear() + 10) // sin vencimiento práctico

  const { data: org, error: orgErr } = await service
    .from('organizations')
    .insert({
      name: 'Barbería Demo — Turno',
      slug: 'demo-turno',
      whatsapp_number: '5200000000000',   // número ficticio
      email: 'demo@turno.app',
      subscription_status: 'active',
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select()
    .single()

  if (orgErr) {
    if (orgErr.code === '23505') {
      console.log('  ↳ Org demo ya existe, buscando...')
      const { data: existing } = await service.from('organizations').select('*').eq('slug', 'demo-turno').single()
      if (!existing) { console.error('No se pudo encontrar org demo'); process.exit(1) }
      await seedUser(existing)
      return
    }
    console.error('Error creando org:', orgErr.message)
    process.exit(1)
  }

  console.log(`  ✓ Org creada: "${org.name}" (${org.id})`)

  // 2. Crear branch
  await service.from('branches').insert({ organization_id: org.id, name: 'Barbería Demo — Turno' })

  // 3. Poblar con datos demo
  await seedDemoData(org.id)

  // 4. Crear usuario demo
  await seedUser(org)
}

async function seedUser(org: { id: string; name: string }) {
  console.log('\n=== Creando usuario demo para JL ===\n')

  const DEMO_EMAIL = 'jl.demo@turno.app'

  const { data: existing } = await service.auth.admin.listUsers()
  const existingUser = existing?.users.find(u => u.email === DEMO_EMAIL)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    console.log(`  ↳ Usuario ya existe (${userId})`)
    await service.auth.admin.updateUserById(userId, {
      user_metadata: { organization_id: org.id },
    })
  } else {
    const { data: newUser, error } = await service.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: 'TurnoDemo2024!',
      email_confirm: true,
      user_metadata: { organization_id: org.id },
    })
    if (error || !newUser.user) { console.error('Error:', error?.message); return }
    userId = newUser.user.id
    console.log(`  ↳ Usuario creado (${userId})`)
  }

  // Staff record
  const { data: existingStaff } = await service
    .from('staff')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!existingStaff) {
    await service.from('staff').insert({
      organization_id: org.id,
      user_id: userId,
      name: 'JL de los Santos',
      role: 'owner',
    })
  }

  console.log(`\n✅ Listo.\n`)
  console.log(`  Email:      jl.demo@turno.app`)
  console.log(`  Contraseña: TurnoDemo2024!`)
  console.log(`  Org:        ${org.name}`)
  console.log(`\n  JL entra con esta cuenta para demos de venta.`)
  console.log(`  Su cuenta principal jldelossantos.san@gmail.com mantiene acceso a /admin.\n`)
}

async function seedDemoData(orgId: string) {
  console.log('  Poblando datos demo...')

  // Servicios
  await service.from('services').insert([
    { organization_id: orgId, name: 'Corte clásico', duration_minutes: 30, price: 150, is_active: true },
    { organization_id: orgId, name: 'Corte + Barba', duration_minutes: 50, price: 220, is_active: true },
    { organization_id: orgId, name: 'Barba', duration_minutes: 25, price: 100, is_active: true },
    { organization_id: orgId, name: 'Corte infantil', duration_minutes: 25, price: 120, is_active: true },
  ])

  // Staff demo
  const { data: staffList } = await service.from('staff').insert([
    { organization_id: orgId, name: 'Carlos Reyes', role: 'staff', is_active: true },
    { organization_id: orgId, name: 'Miguel Torres', role: 'staff', is_active: true },
  ]).select()

  // Horarios para cada barbero (lunes a sábado)
  if (staffList) {
    for (const s of staffList) {
      const days = [1, 2, 3, 4, 5, 6]
      await service.from('staff_schedules').insert(
        days.map(d => ({
          staff_id: s.id,
          day_of_week: d,
          start_time: '09:00',
          end_time: '19:00',
          is_working: true,
        }))
      )
    }
  }

  console.log('  ✓ Servicios, barberos y horarios creados')
}

main().catch(console.error)
