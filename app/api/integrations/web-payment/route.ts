import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { waId } from '@/lib/payment-links'
import { detectLanguage } from '@/lib/language'

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0 }

function authorized(req: Request) {
  const secret = process.env.WEB_PAYMENT_SECRET
  const got = req.headers.get('x-webhook-secret') ?? ''
  if (!secret || !got) return false
  const a = Buffer.from(got), b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Un sitio web del negocio avisa que un cobro de Stripe ya se confirmó. Se guarda como reserva "pendiente de agendar"
 * (acepta sin fecha y sin teléfono), se avisa al dueño por WhatsApp y, si dejó teléfono, se le confirma al cliente.
 * Idempotente por (negocio, payment_ref): si el sitio reintenta no se duplica ni se vuelve a avisar.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const b = await req.json().catch(() => null)
  const slug = clean(b?.org_slug, 80), ref = clean(b?.payment_ref, 120), service = clean(b?.service_name, 160)
  if (!slug || !ref || !service) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations')
    .select('id, name, whatsapp_number, ultramsg_instance, ultramsg_token').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const date = /^\d{4}-\d{2}-\d{2}$/.test(clean(b.booking_date, 10)) ? clean(b.booking_date, 10) : null
  const time = /^(ASAP|\d{2}:\d{2})$/.test(clean(b.booking_time, 5)) ? clean(b.booking_time, 5) : null
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean(b.customer_email, 200)) ? clean(b.customer_email, 200) : null
  const phoneDigits = clean(b.customer_phone, 40).replace(/\D/g, '')
  const phone = phoneDigits.length >= 8 && phoneDigits.length <= 15 ? phoneDigits : null
  const currency = clean(b.currency, 3).toLowerCase() === 'mxn' ? 'mxn' : 'usd'
  const paid = num(b.paid_amount), total = b.total_amount != null ? num(b.total_amount) : null
  const stripeUrl = /^https:\/\/dashboard\.stripe\.com\//.test(clean(b.stripe_url, 300)) ? clean(b.stripe_url, 300) : null

  const { data: row, error } = await db.from('web_bookings').insert({
    organization_id: org.id, source: clean(b.source, 60) || 'web', payment_ref: ref, service_name: service,
    customer_name: clean(b.customer_name, 120) || null, customer_phone: phone, customer_email: email,
    booking_date: date, booking_time: time, location: clean(b.location, 300) || null, notes: clean(b.notes, 400) || null,
    currency, paid_amount: paid, total_amount: total, stripe_url: stripeUrl,
  }).select('id').single()
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true }) // ya registrada: no se avisa de nuevo
    console.error('[web-payment] no se pudo guardar', error)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  const money = (n: number) => `$${n.toFixed(2)} ${currency.toUpperCase()}`
  const when = date ? `${date}${time ? ` ${time === 'ASAP' ? '(lo antes posible)' : time}` : ''}` : (time === 'ASAP' ? 'Lo antes posible' : 'Sin fecha: hay que agendar')
  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  const name = clean(b.customer_name, 120)

  if (org.whatsapp_number) {
    await sendMessage(`${waId(org.whatsapp_number)}@c.us`,
      `💰 *Reserva pagada desde el sitio*\n🩺 ${service}\n👤 ${name || 'Sin nombre'}${phone ? ` (+${phone})` : ''}${email ? `\n✉️ ${email}` : ''}\n🕐 ${when}${b.location ? `\n📍 ${clean(b.location, 300)}` : ''}${b.notes ? `\n📝 ${clean(b.notes, 400)}` : ''}\n💵 Anticipo: ${money(paid)}${total != null && total > paid ? ` · saldo ${money(total - paid)}` : ''}${!phone ? '\n⚠️ No dejó teléfono: contáctalo por correo.' : ''}\nQuedó en el panel › Reservas web.`,
      creds).catch(e => console.error('[web-payment] aviso al dueño falló', e))
  }
  // El sitio de la clínica es en inglés: la confirmación sale en inglés salvo que el servicio venga claramente en español
  if (phone) {
    const en = detectLanguage([service, clean(b.notes, 400)]) === 'en' || clean(b.lang, 2) === 'en'
    await sendMessage(phone,
      en ? `✅ Payment received! We got your ${money(paid)} deposit for *${service}* at *${org.name}*. We'll contact you shortly to confirm the details.`
         : `✅ ¡Pago recibido! Recibimos tu anticipo de ${money(paid)} por *${service}* en *${org.name}*. Te contactamos en breve para confirmar los detalles.`,
      creds).catch(e => console.error('[web-payment] aviso al cliente falló', e))
  }
  return NextResponse.json({ ok: true, id: row.id })
}
