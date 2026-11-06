import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'

const PENDING_HOLD_MIN = 30
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** Inscripción pública a un evento: guarda al corredor como pendiente y lo manda a pagar por Stripe Checkout. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null)
  if (!b) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })

  const full_name = clean(b.full_name, 120)
  const phone = clean(b.phone, 30).replace(/[^\d+]/g, '')
  const email = clean(b.email, 160).toLowerCase()
  if (full_name.length < 3) return NextResponse.json({ error: 'Escribe tu nombre completo' }, { status: 400 })
  if (phone.replace(/\D/g, '').length < 10) return NextResponse.json({ error: 'Escribe un teléfono de 10 dígitos' }, { status: 400 })
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Escribe un correo válido para enviarte tu confirmación' }, { status: 400 })

  const db = createServiceClient()
  const { data: ev } = await db.from('events').select('id, organization_id, slug, title, price, currency, capacity, is_open, event_date, packages').eq('slug', clean(b.slug, 80)).maybeSingle()
  if (!ev || !ev.is_open || new Date(ev.event_date) < new Date()) return NextResponse.json({ error: 'Las inscripciones de este evento están cerradas' }, { status: 400 })

  if (ev.capacity) {
    const hold = new Date(Date.now() - PENDING_HOLD_MIN * 60_000).toISOString()
    const { count } = await db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', ev.id)
      .or(`status.eq.paid,and(status.eq.pending,created_at.gte.${hold})`)
    if ((count ?? 0) >= ev.capacity) return NextResponse.json({ error: 'Se agotaron los lugares' }, { status: 409 })
  }

  // El precio sale siempre del servidor: del paquete elegido (o del precio base del evento si no hay paquetes)
  const packages = (Array.isArray(ev.packages) ? ev.packages : []) as { name: string; price: number }[]
  const pkg = packages.length ? packages.find(p => p.name === clean(b.package, 60)) : null
  if (packages.length && !pkg) return NextResponse.json({ error: 'Elige un paquete de inscripción' }, { status: 400 })
  const price = Number(pkg?.price ?? ev.price)

  const { data: reg, error } = await db.from('event_registrations').insert({
    event_id: ev.id, organization_id: ev.organization_id, full_name, phone, email,
    birth_date: clean(b.birth_date, 10) || null, shirt_size: clean(b.shirt_size, 10) || null,
    emergency_name: clean(b.emergency_name, 120) || null, emergency_phone: clean(b.emergency_phone, 30) || null,
    amount: price, package_name: pkg?.name ?? null,
  }).select('id').single()
  if (error || !reg) return NextResponse.json({ error: 'No se pudo registrar, intenta de nuevo' }, { status: 500 })

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ quantity: 1, price_data: { currency: ev.currency === 'usd' ? 'usd' : 'mxn', unit_amount: Math.round(price * 100), product_data: { name: `Inscripción${pkg ? ` ${pkg.name}` : ''} — ${ev.title}`, description: full_name } } }],
      success_url: `${base}/carrera/${ev.slug}/gracias`,
      cancel_url: `${base}/carrera/${ev.slug}?cancelado=1`,
      metadata: { type: 'event_registration', registration_id: reg.id, organization_id: ev.organization_id },
    })
    await db.from('event_registrations').update({ stripe_session_id: session.id }).eq('id', reg.id)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[events] checkout falló', err)
    await db.from('event_registrations').update({ status: 'cancelled' }).eq('id', reg.id)
    return NextResponse.json({ error: 'No se pudo abrir el pago, intenta de nuevo' }, { status: 500 })
  }
}
