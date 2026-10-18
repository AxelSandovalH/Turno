import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'

/** Anticipo pagado: confirma la cita y avisa al cliente y al negocio. */
export async function handleDepositPaid(db: ReturnType<typeof createServiceClient>, appointmentId: string) {
  const { data: appt } = await db
    .from('appointments')
    .select(`
      id, status, starts_at,
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

  // El cron de deposit-timeout ya canceló la cita antes de que llegara el pago —
  // el cliente pagó tarde. No reactivamos el horario (pudo tomarlo alguien más);
  // se notifica para que el negocio lo resuelva a mano.
  if (appt.status === 'cancelled') {
    if (customer?.phone) {
      await sendMessage(
        customer.phone,
        `Recibimos tu pago, pero tu horario ya se había liberado por falta de confirmación a tiempo. Escríbenos para reagendar tu cita. 🙏`,
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

  const localTime = new Date(appt.starts_at).toLocaleString('es-MX', {
    timeZone: org.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  if (customer?.phone) {
    await sendMessage(
      customer.phone,
      `✅ ¡Anticipo recibido! Tu cita de *${svc?.name ?? 'tu servicio'}* el ${localTime} quedó confirmada. Te esperamos en *${org.name}*.`,
      creds
    ).catch(e => console.error('[deposit] whatsapp failed', e))
  }
  await sendMessage(
    `${org.whatsapp_number}@c.us`,
    `💰 *Anticipo pagado*\n👤 ${customer?.name ?? customer?.phone ?? 'Cliente'}\n🕐 ${localTime}\nLa cita quedó confirmada.`,
    creds
  ).catch(e => console.error('[deposit] whatsapp failed', e))
}
