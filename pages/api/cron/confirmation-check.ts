import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

// Corre 2 horas antes de la cita — marca como riesgo si no hay confirmación
// y notifica al terapeuta responsable vía WhatsApp

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const service = createServiceClient()
  const now = new Date()

  // Citas en las próximas 2 h (ventana 100–140 min) con confirmación pending
  const windowStart = new Date(now.getTime() + 100 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 140 * 60 * 1000)

  const { data: appointments, error } = await service
    .from('appointments')
    .select(`
      id,
      starts_at,
      organization:organizations(id),
      customer:customers(name, phone),
      service:services(name),
      staff:staff(name, phone)
    `)
    .eq('status', 'confirmed')
    .eq('confirmation_status', 'pending')
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (error) return res.status(500).json({ error: error.message })
  if (!appointments || appointments.length === 0) return res.status(200).json({ flagged: 0 })

  const instance = process.env.ULTRAMSG_INSTANCE!
  const token    = process.env.ULTRAMSG_TOKEN!
  let flagged = 0

  for (const appt of appointments) {
    const customer = appt.customer as unknown as { name: string; phone: string } | null
    const stf      = appt.staff    as unknown as { name: string; phone: string | null } | null
    const svc      = appt.service  as unknown as { name: string } | null

    // Marcar como riesgo
    await service.from('appointments')
      .update({ confirmation_status: 'risk' })
      .eq('id', appt.id)

    // Notificar al terapeuta si tiene teléfono
    if (stf?.phone) {
      const time = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City',
      })
      const alert = [
        `⚠️ *Cita sin confirmar*`,
        ``,
        `${customer?.name ?? 'Un paciente'} no ha confirmado su cita de *${svc?.name ?? 'sesión'}* hoy a las *${time}*.`,
        ``,
        `Te avisamos para que puedas contactarle directamente.`,
      ].join('\n')

      try {
        await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, to: stf.phone, body: alert }),
        })
      } catch (err) {
        console.error(`Therapist alert failed for appt ${appt.id}:`, err)
      }
    }

    flagged++
  }

  return res.status(200).json({ flagged, total: appointments.length })
}
