import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createDepositCheckoutSession } from '@/lib/stripe'
import { sendMessage } from '@/lib/ultramsg'
import { addMinutes } from 'date-fns'
import { fromZonedTime, toZonedTime, format } from 'date-fns-tz'
import { es } from 'date-fns/locale'

const DEPOSIT_TIMEOUT_MINUTES = 20

// Crea la cita directamente desde la página pública de reservas (sin pasar
// por WhatsApp) — misma lógica que el tool create_appointment del bot:
// valida el slot, registra al cliente, bloquea el horario y, si el negocio
// cobra anticipo, genera el checkout de Stripe antes de confirmar.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { slug, service_id, staff_id, date, slot, customer_name, customer_phone } = body ?? {}

  if (!slug || !service_id || !staff_id || !date || !slot || !customer_name?.trim() || !customer_phone?.trim()) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name, timezone, whatsapp_number, ultramsg_instance, ultramsg_token, deposit_enabled, deposit_amount')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: branch } = await db
    .from('branches')
    .select('id')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .maybeSingle()

  const { data: service } = await db
    .from('services')
    .select('name, duration_minutes')
    .eq('id', service_id)
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .single()
  if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

  const { data: staff } = await db
    .from('staff')
    .select('name')
    .eq('id', staff_id)
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .single()
  if (!staff) return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 })

  const startsAt = fromZonedTime(`${date}T${slot}:00`, org.timezone)
  const endsAt = addMinutes(startsAt, service.duration_minutes)
  if (startsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Ese horario ya pasó, elige otro' }, { status: 400 })
  }

  const phone = customer_phone.replace(/\D/g, '')

  // Confirma que el slot sigue libre justo antes de reservar (evita doble booking)
  const { data: conflict } = await db
    .from('appointments')
    .select('id')
    .eq('staff_id', staff_id)
    .eq('status', 'confirmed')
    .lt('starts_at', endsAt.toISOString())
    .gt('ends_at', startsAt.toISOString())
    .maybeSingle()
  if (conflict) {
    return NextResponse.json({ error: 'Ese horario ya no está disponible. Elige otro.' }, { status: 409 })
  }

  const { data: customer } = await db
    .from('customers')
    .upsert({ organization_id: org.id, phone, name: customer_name.trim() }, { onConflict: 'organization_id,phone' })
    .select('id')
    .single()
  if (!customer) return NextResponse.json({ error: 'Error al registrar tus datos' }, { status: 500 })

  const { data: appointment, error: apptError } = await db
    .from('appointments')
    .insert({
      organization_id: org.id,
      branch_id: branch?.id ?? null,
      customer_id: customer.id,
      staff_id,
      service_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
    })
    .select('id')
    .single()
  if (apptError || !appointment) {
    return NextResponse.json({ error: apptError?.message ?? 'No se pudo crear la cita' }, { status: 500 })
  }

  await db.from('audit_logs').insert({
    organization_id: org.id,
    actor_type: 'customer',
    action: 'appointment.created',
    resource_type: 'appointment',
    resource_id: appointment.id,
    metadata: { customer_phone: phone, customer_name, source: 'booking-page' },
  })

  const localTime = format(toZonedTime(startsAt, org.timezone), "EEEE d 'de' MMMM 'a las' HH:mm", { timeZone: org.timezone, locale: es })
  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }

  // Anticipo requerido: la cita ya bloqueó el horario — se confirma al pagar
  if (org.deposit_enabled && Number(org.deposit_amount) > 0) {
    try {
      const { url, sessionId } = await createDepositCheckoutSession({
        organizationId: org.id,
        appointmentId: appointment.id,
        amountPesos: Number(org.deposit_amount),
        businessName: org.name,
        serviceName: service.name,
      })
      const expiresAt = new Date(Date.now() + DEPOSIT_TIMEOUT_MINUTES * 60000).toISOString()
      await db.from('appointments').update({
        deposit_status: 'pending',
        deposit_amount: org.deposit_amount,
        stripe_checkout_session_id: sessionId,
        deposit_checkout_url: url,
        deposit_expires_at: expiresAt,
      }).eq('id', appointment.id)

      if (org.whatsapp_number) {
        sendMessage(
          `${org.whatsapp_number}@c.us`,
          `📅 *Nueva cita desde la página de reservas*\n👤 ${customer_name} (${phone})\n💆 ${service.name} con ${staff.name}\n🕐 ${localTime}\n⏳ Esperando anticipo del cliente`,
          creds
        ).catch(() => {})
      }

      return NextResponse.json({ ok: true, requiresPayment: true, checkoutUrl: url })
    } catch (err) {
      console.error('[booking/create] deposit checkout failed:', err)
      // Sin link de pago, la cita sigue existiendo — mejor confirmarla sin anticipo que perderla
    }
  }

  // Sin anticipo: la cita queda confirmada de inmediato
  if (org.whatsapp_number) {
    sendMessage(
      `${org.whatsapp_number}@c.us`,
      `📅 *Nueva cita desde la página de reservas*\n👤 ${customer_name} (${phone})\n💆 ${service.name} con ${staff.name}\n🕐 ${localTime}`,
      creds
    ).catch(() => {})
  }
  sendMessage(
    phone,
    `✅ ¡Tu cita quedó confirmada!\n\n💆 ${service.name}\n📅 ${localTime}\n👤 Con ${staff.name}\n\nTe esperamos en *${org.name}*.`,
    creds
  ).catch(() => {})

  return NextResponse.json({ ok: true, requiresPayment: false, appointmentId: appointment.id })
}
