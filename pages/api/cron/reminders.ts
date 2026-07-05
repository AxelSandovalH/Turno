import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { resend, FROM } from '@/lib/resend'
import { reminderEmailHtml, reminderEmailText } from '@/lib/emails/reminder'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const service = createServiceClient()

  const now = new Date()
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 75 * 60 * 1000)

  const { data: appointments, error } = await service
    .from('appointments')
    .select(`
      id,
      starts_at,
      reminder_sent_at,
      organization:organizations(name, id, ultramsg_instance, ultramsg_token),
      customer:customers(name, phone, email),
      service:services(name),
      staff:staff(name)
    `)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (error) return res.status(500).json({ error: error.message })
  if (!appointments || appointments.length === 0) return res.status(200).json({ sent: 0 })

  let sent = 0

  for (const appt of appointments) {
    const customer = appt.customer as unknown as { name: string; phone: string; email: string | null } | null
    const svc      = appt.service  as unknown as { name: string } | null
    const stf      = appt.staff    as unknown as { name: string } | null
    const org      = appt.organization as unknown as { name: string; id: string; ultramsg_instance: string | null; ultramsg_token: string | null } | null
    const creds    = { instance: org?.ultramsg_instance, token: org?.ultramsg_token }

    if (!customer?.phone) continue

    const time = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Mexico_City',
    })

    const dateLabel = `hoy a las ${time}`

    // ── WhatsApp: recordatorio + solicitud de confirmación ─────────────────────
    const whatsappMessage = [
      `🔔 *Recordatorio de cita*`,
      ``,
      `Hola ${customer.name ?? 'estimado paciente'}, tienes cita en *${org?.name}* ${dateLabel}.`,
      ``,
      `📋 Servicio: ${svc?.name ?? 'N/A'}`,
      `👤 Con: ${stf?.name ?? 'N/A'}`,
      ``,
      `¿Confirmas tu asistencia?`,
      `Responde *SI* para confirmar o *NO* si no podrás asistir.`,
    ].join('\n')

    try {
      const r = await sendMessage(customer.phone, whatsappMessage, creds)
      if (!r?.error) {
        await service.from('appointments').update({
          reminder_sent_at: new Date().toISOString(),
          confirmation_status: 'pending',
          confirmation_sent_at: new Date().toISOString(),
        }).eq('id', appt.id)
        sent++
      }
    } catch (err) {
      console.error(`WhatsApp reminder failed for ${appt.id}:`, err)
    }

    // ── Email de respaldo (si el paciente tiene correo) ────────────────────────
    if (customer.email) {
      try {
        await resend.emails.send({
          from: FROM,
          to: customer.email,
          subject: `Recordatorio: tu cita en ${org?.name} ${dateLabel}`,
          html: reminderEmailHtml({
            customerName: customer.name ?? 'Paciente',
            businessName: org?.name ?? 'el consultorio',
            serviceName: svc?.name ?? 'tu sesión',
            staffName: stf?.name ?? 'tu terapeuta',
            dateLabel,
          }),
          text: reminderEmailText({
            customerName: customer.name ?? 'Paciente',
            businessName: org?.name ?? 'el consultorio',
            serviceName: svc?.name ?? 'tu sesión',
            staffName: stf?.name ?? 'tu terapeuta',
            dateLabel,
          }),
        })
      } catch (err) {
        console.error(`Email reminder failed for ${appt.id}:`, err)
      }
    }
  }

  return res.status(200).json({ sent, total: appointments.length })
}
