import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { waId } from '@/lib/payment-links'
import { detectLanguage } from '@/lib/language'
import { staffCanDo } from '@/lib/staff-services'
import { addMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

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
    .select('id, name, timezone, whatsapp_number, ultramsg_instance, ultramsg_token').eq('slug', slug).eq('is_active', true).maybeSingle()
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

  // Con fecha y hora definidas (y teléfono) la reserva entra sola a Citas; si algo no cuadra se queda en el panel para agendarla a mano
  let autoNote = ''
  if (date && time && time !== 'ASAP' && phone) {
    const r = await autoSchedule(db, org, { service, date, time, phone, name: clean(b.customer_name, 120), notes: clean(b.notes, 400), location: clean(b.location, 300) })
    if (r.ok) { await db.from('web_bookings').update({ status: 'scheduled' }).eq('id', row.id); autoNote = '\n✅ Ya quedó agendada en Citas.' }
    else autoNote = `\n⚠️ No se agendó sola (${r.reason}): agéndala desde Reservas web.`
  }

  const money = (n: number) => `$${n.toFixed(2)} ${currency.toUpperCase()}`
  const when = date ? `${date}${time ? ` ${time === 'ASAP' ? '(lo antes posible)' : time}` : ''}` : (time === 'ASAP' ? 'Lo antes posible' : 'Sin fecha: hay que agendar')
  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  const name = clean(b.customer_name, 120)

  if (org.whatsapp_number) {
    await sendMessage(`${waId(org.whatsapp_number)}@c.us`,
      `💰 *Reserva pagada desde el sitio*\n🩺 ${service}\n👤 ${name || 'Sin nombre'}${phone ? ` (+${phone})` : ''}${email ? `\n✉️ ${email}` : ''}\n🕐 ${when}${b.location ? `\n📍 ${clean(b.location, 300)}` : ''}${b.notes ? `\n📝 ${clean(b.notes, 400)}` : ''}\n💵 Anticipo: ${money(paid)}${total != null && total > paid ? ` · saldo ${money(total - paid)}` : ''}${!phone ? '\n⚠️ No dejó teléfono: contáctalo por correo.' : ''}\nQuedó en el panel › Reservas web.${autoNote}`,
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

type OrgRow = { id: string; timezone: string | null }

async function autoSchedule(db: ReturnType<typeof createServiceClient>, org: OrgRow, a: { service: string; date: string; time: string; phone: string; name: string; notes: string; location: string }): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const { data: services } = await db.from('services').select('id, name, duration_minutes').eq('organization_id', org.id).eq('is_active', true)
    const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
    const svc = (services ?? []).find(x => norm(x.name) === norm(a.service))
    if (!svc) return { ok: false, reason: 'no hay un servicio con ese nombre en Turno' }

    const startsAt = fromZonedTime(`${a.date}T${a.time}:00`, org.timezone || 'America/Mazatlan')
    if (isNaN(startsAt.getTime())) return { ok: false, reason: 'fecha inválida' }
    const endsAt = addMinutes(startsAt, svc.duration_minutes)

    const { data: staff } = await db.from('staff').select('id').eq('organization_id', org.id).eq('is_active', true)
    let staffId: string | null = null
    for (const st of staff ?? []) {
      if (!(await staffCanDo(db, st.id, svc.id))) continue
      const { data: busy } = await db.from('appointments').select('id').eq('staff_id', st.id).eq('status', 'confirmed')
        .lt('starts_at', endsAt.toISOString()).gt('ends_at', startsAt.toISOString()).limit(1).maybeSingle()
      if (!busy) { staffId = st.id; break }
    }
    if (!staffId) return { ok: false, reason: 'no hay profesional libre a esa hora' }

    const { data: customer } = await db.from('customers')
      .upsert({ organization_id: org.id, phone: a.phone, name: a.name || null }, { onConflict: 'organization_id,phone' }).select('id').single()
    if (!customer) return { ok: false, reason: 'no se pudo registrar al cliente' }

    const { data: branch } = await db.from('branches').select('id').eq('organization_id', org.id).eq('is_active', true).limit(1).maybeSingle()
    const { error } = await db.from('appointments').insert({
      organization_id: org.id, branch_id: branch?.id ?? null, customer_id: customer.id, staff_id: staffId, service_id: svc.id,
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: 'confirmed',
      deposit_status: 'paid', deposit_paid_at: new Date().toISOString(),
      notes: ['Reserva pagada desde el sitio', a.location && `Lugar: ${a.location}`, a.notes].filter(Boolean).join(' · '),
    })
    if (error) return { ok: false, reason: 'el horario ya está ocupado' }
    return { ok: true }
  } catch (e) {
    console.error('[web-payment] auto-agenda falló', e)
    return { ok: false, reason: 'error interno' }
  }
}
