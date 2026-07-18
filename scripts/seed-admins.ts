/**
 * One-time script to set up platform admins for Turno.
 * Run: npx tsx scripts/seed-admins.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Platform admins — access /admin, NOT any barbershop dashboard
const PLATFORM_ADMINS = [
  { email: 'axesan917@gmail.com', name: 'Axel Sandoval' },
  { email: 'jldelossantos.san@gmail.com', name: 'JL de los Santos' },
]

// Barbershop org admins — access the barbershop dashboard
const ORG_ADMINS: { email: string; name: string }[] = [
  // Add barbershop owners here if needed
]

async function main() {
  const { data: existing } = await service.auth.admin.listUsers()
  const allUsers = existing?.users ?? []

  console.log('\n=== Platform Admins ===\n')

  for (const admin of PLATFORM_ADMINS) {
    console.log(`Processing: ${admin.email}`)
    const existingUser = allUsers.find(u => u.email === admin.email)
    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log(`  ↳ Exists (${userId})`)
    } else {
      const { data: newUser, error } = await service.auth.admin.createUser({
        email: admin.email,
        password: 'Turno2024!',
        email_confirm: true,
      })
      if (error || !newUser.user) { console.error(`  ↳ Create failed:`, error?.message); continue }
      userId = newUser.user.id
      console.log(`  ↳ Created (${userId})`)
    }

    // Set is_platform_admin = true, clear organization_id
    await service.auth.admin.updateUserById(userId, {
      user_metadata: { is_platform_admin: true, organization_id: null },
    })
    console.log(`  ↳ Set is_platform_admin: true, cleared organization_id`)
    console.log(`  ✓ Done\n`)
  }

  if (ORG_ADMINS.length > 0) {
    const { data: orgs } = await service.from('organizations').select('id, name').limit(1)
    const org = orgs?.[0]
    if (!org) { console.error('No orgs found for ORG_ADMINS'); return }

    console.log(`\n=== Org Admins → "${org.name}" ===\n`)

    for (const admin of ORG_ADMINS) {
      console.log(`Processing: ${admin.email}`)
      const existingUser = allUsers.find(u => u.email === admin.email)
      let userId: string

      if (existingUser) {
        userId = existingUser.id
        await service.auth.admin.updateUserById(userId, {
          user_metadata: { organization_id: org.id, is_platform_admin: false },
        })
      } else {
        const { data: newUser, error } = await service.auth.admin.createUser({
          email: admin.email, password: 'Turno2024!', email_confirm: true,
          user_metadata: { organization_id: org.id },
        })
        if (error || !newUser.user) { console.error(`  ↳ Create failed:`, error?.message); continue }
        userId = newUser.user.id
        await service.from('staff').insert({ organization_id: org.id, user_id: userId, name: admin.name, role: 'Dueño', is_owner: true })
      }
      console.log(`  ✓ Done\n`)
    }
  }

  console.log('Seed complete.')
  console.log('Platform admins → /admin')
  console.log('Temp password for new users: Turno2024!')
}

main().catch(console.error)
