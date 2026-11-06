import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'

const PENDING_HOLD_MIN = 30
const MIN_DONATION = 20
const MAX_DONATION = 50000
const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** Inscripción pública (o donación) a un evento: guarda el registro como pendiente y manda a pagar por Stripe Checkout. */
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

  // Los precios salen siempre del servidor: del paquete elegido; la donación libre solo se valida en rango
  type Pk = { name: string; price: number; kind?: string }
  const all = (Array.isArray(ev.packages) ? ev.packages : []) as Pk[]
  const racePkgs = all.filter(x => x.kind !== 'donation')
  const donPkgs = all.filter(x => x.kind === 'donation')
  const mode = b.mode === 'donate' ? 'donate' : 'run'
  const typed = Math.round(Number(b.donation_amount) || 0)
  if (typed < 0 || typed > MAX_DONATION) return NextResponse.json({ error: `La donación debe ser de ${MIN_DONATION} a ${MAX_DONATION} pesos` }, { status: 400 })

  let racePrice = 0, donation = 0, packageName: string | null = null
  if (mode === 'run') {
    if (ev.capacity) {
      const hold = new Date(Date.now() - PENDING_HOLD_MIN * 60_000).toISOString()
      const { count } = await db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('kind', 'race')
        .or(`status.eq.paid,and(status.eq.pending,created_at.gte.${hold})`)
      if ((count ?? 0) >= ev.capacity) return NextResponse.json({ error: 'Se agotaron los lugares' }, { status: 409 })
    }
    const pkg = racePkgs.length ? racePkgs.find(x => x.name === clean(b.package, 60)) : null
    if (racePkgs.length && !pkg) return NextResponse.json({ error: 'Elige un paquete de inscripción' }, { status: 400 })
    racePrice = Number(pkg?.price ?? ev.price)
    packageName = pkg?.name ?? null
    if (typed > 0 && typed < MIN_DONATION) return NextResponse.json({ error: `La donación mínima es de ${MIN_DONATION} pesos` }, { status: 400 })
    donation = typed
  } else {
    const dp = donPkgs.find(x => x.name === clean(b.package, 60))
    donation = dp ? Number(dp.price) : typed
    packageName = dp?.name ?? 'Donación libre'
    if (!(donation >= MIN_DONATION)) return NextResponse.json({ error: `La donación mínima es de ${MIN_DONATION} pesos` }, { status: 400 })
  }
  const amount = racePrice + donation
  const isRun = mode === 'run'

  const { data: reg, error } = await db.from('event_registrations').insert({
    event_id: ev.id, organization_id: ev.organization_id, full_name, phone, email,
    kind: isRun ? 'race' : 'donation', donation_amount: donation,
    birth_date: isRun ? clean(b.birth_date, 10) || null : null, shirt_size: isRun ? clean(b.shirt_size, 10) || null : null,
    emergency_name: isRun ? clean(b.emergency_name, 120) || null : null, emergency_phone: isRun ? clean(b.emergency_phone, 30) || null : null,
    amount, package_name: packageName,
  }).select('id').single()
  if (error || !reg) return NextResponse.json({ error: 'No se pudo registrar, intenta de nuevo' }, { status: 500 })

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL
    const currency = ev.currency === 'usd' ? 'usd' : 'mxn'
    const items = [
      ...(racePrice > 0 ? [{ quantity: 1, price_data: { currency, unit_amount: Math.round(racePrice * 100), product_data: { name: `Inscripción${packageName ? ` ${packageName}` : ''} — ${ev.title}`, description: full_name } } }] : []),
      ...(donation > 0 ? [{ quantity: 1, price_data: { currency, unit_amount: Math.round(donation * 100), product_data: { name: `Donación — ${ev.title}`, description: isRun ? full_name : `${packageName} · ${full_name}` } } }] : []),
    ]
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: items,
      success_url: `${base}/carrera/${ev.slug}/gracias${isRun ? '' : '?donacion=1'}`,
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
