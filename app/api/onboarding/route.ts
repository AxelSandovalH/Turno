import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const { userId, name, slug, whatsappNumber, email, businessType } = await req.json()
  if (!userId || !name || !whatsappNumber) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = createServiceClient()

  // Create organization
  const { data: org, error: orgError } = await db
    .from('organizations')
    .insert({ name, slug: slug ?? name.toLowerCase().replace(/\s+/g, '-'), whatsapp_number: whatsappNumber, business_type: businessType ?? 'barbershop' })
    .select()
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  // Create staff record as owner
  await db.from('staff').insert({
    organization_id: org.id,
    name: name,
    role: 'owner',
    email: email ?? null,
    is_active: true,
  })

  // Assign org to user metadata
  const { error: metaError } = await db.auth.admin.updateUserById(userId, {
    user_metadata: { organization_id: org.id },
  })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  return NextResponse.json({ organizationId: org.id })
}
