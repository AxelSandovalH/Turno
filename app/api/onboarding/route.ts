import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const { userId, name, slug, whatsappNumber, email } = await request.json()

  if (!userId || !name || !slug || !whatsappNumber) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const service = createServiceClient()

  // 1. Create organization
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name,
      slug,
      whatsapp_number: whatsappNumber,
      email,
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: 'trialing',
    })
    .select()
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      return NextResponse.json({ error: 'El número de WhatsApp ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  // 2. Create default branch
  await service.from('branches').insert({
    organization_id: org.id,
    name,
  })

  // 3. Update user metadata with organization_id
  const { error: metaError } = await service.auth.admin.updateUserById(userId, {
    user_metadata: { organization_id: org.id },
  })

  if (metaError) {
    return NextResponse.json({ error: metaError.message }, { status: 500 })
  }

  // 4. Create owner staff record
  await service.from('staff').insert({
    organization_id: org.id,
    user_id: userId,
    name,
    role: 'owner',
  })

  return NextResponse.json({ organizationId: org.id })
}
