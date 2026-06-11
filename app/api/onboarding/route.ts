import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resend, FROM } from '@/lib/resend'
import { welcomeEmailHtml, welcomeEmailText } from '@/lib/emails/welcome'

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

  // Send welcome email (non-blocking — don't fail onboarding if email fails)
  if (email) {
    resend.emails.send({
      from: FROM,
      to: email,
      subject: `¡Bienvenido a QuickTurno, ${name}!`,
      html: welcomeEmailHtml({ businessName: name, whatsappNumber }),
      text: welcomeEmailText({ businessName: name, whatsappNumber }),
    }).catch(err => console.error('[onboarding] welcome email failed:', err))
  }

  return NextResponse.json({ organizationId: org.id })
}
