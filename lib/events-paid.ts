import { sendMessage } from '@/lib/ultramsg'
import { resend, FROM } from '@/lib/resend'
import type { createServiceClient } from '@/lib/supabase/service'

/**
 * Una inscripción (o donación) quedó pagada, por Stripe o por Clip: la marca como pagada, avisa al organizador
 * por WhatsApp y manda la confirmación por correo. Es idempotente: si ya estaba pagada no repite nada.
 */
export async function markEventRegistrationPaid(db: ReturnType<typeof createServiceClient>, regId: string, amount: number) {
  const { data: reg } = await db.from('event_registrations').update({ status: 'paid', paid_at: new Date().toISOString(), amount })
    .eq('id', regId).neq('status', 'paid').select('full_name, email, phone, kind, donation_amount, organization_id, events(title, event_date, location)').maybeSingle()
  const ev = (Array.isArray(reg?.events) ? reg?.events[0] : reg?.events) as { title: string; event_date: string; location: string | null } | undefined
  if (reg?.organization_id) {
    const { data: org } = await db.from('organizations').select('whatsapp_number, ultramsg_instance, ultramsg_token').eq('id', reg.organization_id).maybeSingle()
    if (org?.whatsapp_number) {
      await sendMessage(
        `${org.whatsapp_number}@c.us`,
        amount > 0
          ? `💰 *${reg.kind === 'donation' ? 'Nueva donación' : 'Nueva inscripción pagada'}*\n🏁 ${ev?.title ?? 'Evento'}\n👤 ${reg.full_name}${reg.phone ? `\n📞 ${reg.phone}` : ''}\n💵 $${amount.toLocaleString('es-MX')} MXN`
          : `🏃 *Nueva inscripción (gratuita)*\n🏁 ${ev?.title ?? 'Evento'}\n👤 ${reg.full_name}${reg.phone ? `\n📞 ${reg.phone}` : ''}`,
        { instance: org.ultramsg_instance, token: org.ultramsg_token }
      ).catch(err => console.error('[events] aviso al organizador falló', err))
    }
  }
  if (reg?.email && ev) {
    const when = new Date(ev.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' })
    const isDonation = reg.kind === 'donation'
    const money = (n: number) => `$${Number(n).toLocaleString('es-MX')}`
    const extra = Number(reg.donation_amount) > 0 && !isDonation ? `<p>Gracias también por tu donación de <b>${money(reg.donation_amount)}</b>.</p>` : ''
    await resend.emails.send({
      from: FROM, to: reg.email,
      subject: isDonation ? `Gracias por tu donación — ${ev.title}` : `Inscripción confirmada — ${ev.title}`,
      html: isDonation
        ? `<p>¡Hola ${reg.full_name}!</p><p>Recibimos tu donación de <b>${money(reg.donation_amount)}</b> para <b>${ev.title}</b>. ¡Gracias por ayudar!</p>`
        : `<p>¡Hola ${reg.full_name}!</p><p>Tu inscripción a <b>${ev.title}</b> está confirmada${amount > 0 ? ' y pagada' : ''}.</p>${extra}<p><b>Fecha:</b> ${when}<br/>${ev.location ? `<b>Lugar:</b> ${ev.location}` : ''}</p><p>Presenta tu nombre el día del evento para recoger tu paquete. ¡Nos vemos!</p>`,
    }).catch(err => console.error('[events] correo de confirmación falló', err))
  }
}
