import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { conversationLanguage } from '@/lib/language'

/** Anticipo pagado: confirma la cita y avisa al cliente y al negocio. */
export async function handleDepositPaid(db: ReturnType<typeof createServiceClient>, appointmentId: string, opts: { fullPayment?: boolean } = {}) {
  const { data: appt } = await db
    .from('appointments')
    .select(`
      id, status, starts_at, organization_id,
      customer:customers(name, phone),
      service:services(name),
      organization:organizations(name, whatsapp_number, ultramsg_instance, ultramsg_token, timezone)
    `)
    .eq('id', appointmentId)
    .single()

  if (!appt) return

  await db.from('appointments').update({
    deposit_status: 'paid',
    deposit_paid_at: new Date().toISOString(),
  }).eq('id', appointmentId)

  const customer = appt.customer as unknown as { name: string | null; phone: string } | null
  const svc = appt.service as unknown as { name: string } | null
  const org = appt.organization as unknown as {
    name: string; whatsapp_number: string; ultramsg_instance: string | null; ultramsg_token: string | null; timezone: string
  } | null
  if (!org) return

  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  // Los avisos al cliente salen en el idioma en que escribe con el bot
  const en = (await conversationLanguage(db, appt.organization_id, customer?.phone)) === 'en'

  // El cron de deposit-timeout ya canceló la cita antes de que llegara el pago —
  // el cliente pagó tarde. No reactivamos el horario (pudo tomarlo alguien más);
  // se notifica para que el negocio lo resuelva a mano.
  if (appt.status === 'cancelled') {
    if (customer?.phone) {
      await sendMessage(
        customer.phone,
        en ? `We received your payment, but your slot had already been released because it wasn't confirmed in time. Message us and we'll reschedule your appointment. 🙏` : `Recibimos tu pago, pero tu horario ya se había liberado por falta de confirmación a tiempo. Escríbenos para reagendar tu cita. 🙏`,
        creds
      ).catch(e => console.error('[deposit] whatsapp failed', e))
    }
    await sendMessage(
      `${org.whatsapp_number}@c.us`,
      `⚠️ *Anticipo pagado tarde*\n👤 ${customer?.name ?? customer?.phone ?? 'Cliente'}\nEl horario ya se había liberado. Contáctalo para reagendar.`,
      creds
    ).catch(e => console.error('[deposit] whatsapp failed', e))
    return
  }

  const localTime = new Date(appt.starts_at).toLocaleString(en ? 'en-US' : 'es-MX', {
    timeZone: org.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  if (customer?.phone) {
    await sendMessage(
      customer.phone,
      en
        ? (opts.fullPayment ? `✅ Payment received! Your *${svc?.name ?? 'service'}* appointment on ${localTime} is confirmed. Thank you for choosing *${org.name}*.` : `✅ Deposit received! Your *${svc?.name ?? 'service'}* appointment on ${localTime} is confirmed. See you at *${org.name}*.`)
        : (opts.fullPayment ? `✅ ¡Pago recibido! Tu cita de *${svc?.name ?? 'tu servicio'}* el ${localTime} quedó confirmada. Gracias por elegir *${org.name}*.` : `✅ ¡Anticipo recibido! Tu cita de *${svc?.name ?? 'tu servicio'}* el ${localTime} quedó confirmada. Te esperamos en *${org.name}*.`),
      creds
    ).catch(e => console.error('[deposit] whatsapp failed', e))
  }
  await sendMessage(
    `${org.whatsapp_number}@c.us`,
    `💰 *${opts.fullPayment ? 'Pago recibido' : 'Anticipo pagado'}*\n👤 ${customer?.name ?? customer?.phone ?? 'Cliente'}\n🕐 ${localTime}\nLa cita quedó confirmada.`,
    creds
  ).catch(e => console.error('[deposit] whatsapp failed', e))
}
