import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'
import { resend, FROM } from '@/lib/resend'
import { welcomeEmailHtml, welcomeEmailText } from '@/lib/emails/welcome'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: barbería → barberia
    .replace(/[^a-z0-9\s-]/g, '')    // drop anything not alphanumeric/space/dash
    .trim()
    .replace(/[\s-]+/g, '-')         // collapse spaces/dashes into single dash
    .replace(/^-|-$/g, '')
    || 'negocio'
}

async function uniqueSlug(db: ReturnType<typeof createServiceClient>, base: string): Promise<string> {
  const { data: existing } = await db
    .from('organizations')
    .select('slug')
    .like('slug', `${base}%`)

  const taken = new Set((existing ?? []).map(o => o.slug))
  if (!taken.has(base)) return base

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

export async function POST(req: Request) {
  const { userId, name, slug, whatsappNumber, email, businessType, stripeSessionId } = await req.json()
  if (!userId || !name || !whatsappNumber) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const db = createServiceClient()

  // Generate a clean, unique slug from the business name
  const baseSlug = slugify(slug || name)
  const finalSlug = await uniqueSlug(db, baseSlug)

  // Create organization — queda en 'trialing' (default) hasta que pague; el
  // SubscriptionGate bloquea el dashboard mientras tanto
  const { data: org, error: orgError } = await db
    .from('organizations')
    .insert({ name, slug: finalSlug, whatsapp_number: whatsappNumber, business_type: businessType ?? 'barbershop' })
    .select()
    .single()

  if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })

  // Create staff record as owner
  await db.from('staff').insert({
    organization_id: org.id,
    name: name,
    role: 'Dueño',
    is_owner: true,
    email: email ?? null,
    is_active: true,
  })

  // Assign org to user metadata
  const { error: metaError } = await db.auth.admin.updateUserById(userId, {
    user_metadata: { organization_id: org.id },
  })

  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  // Compra directa desde el anuncio (/comprar): el pago ocurrió ANTES de crear
  // la cuenta. Reclamamos la sesión de Stripe y activamos la org de inmediato.
  let alreadyPaid = false
  if (stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId)
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      // Solo sesiones de compra directa, pagadas y sin org reclamada aún
      if (session.payment_status === 'paid' && session.metadata?.source === 'direct-ad' && subId) {
        const { data: claimed } = await db
          .from('organizations')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()
        if (!claimed) {
          await db.from('organizations').update({
            subscription_status: 'active',
            stripe_subscription_id: subId,
            ...(customerId ? { stripe_customer_id: customerId } : {}),
          }).eq('id', org.id)
          // Liga la suscripción a la org para que los webhooks futuros la encuentren
          await stripe.subscriptions.update(subId, {
            metadata: { organization_id: org.id, plan: 'turno-ai' },
          }).catch(err => console.error('[onboarding] sub metadata update failed:', err))
          alreadyPaid = true
        }
      }
    } catch (err) {
      console.error('[onboarding] claim stripe session failed:', err)
    }
  }

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

  return NextResponse.json({ organizationId: org.id, alreadyPaid })
}
