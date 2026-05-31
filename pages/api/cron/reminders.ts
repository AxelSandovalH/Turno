import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      organization:organizations(name),
      customer:customers(name, phone),
      service:services(name),
      staff:staff(name)
    `)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (error) return res.status(500).json({ error: error.message })
  if (!appointments || appointments.length === 0) return res.status(200).json({ sent: 0 })

  const instance = process.env.ULTRAMSG_INSTANCE!
  const token    = process.env.ULTRAMSG_TOKEN!
  let sent = 0

  for (const appt of appointments) {
    const customer = appt.customer as unknown as { name: string; phone: string } | null
    const svc      = appt.service  as unknown as { name: string } | null
    const stf      = appt.staff    as unknown as { name: string } | null
    const org      = appt.organization as unknown as { name: string } | null

    if (!customer?.phone) continue

    const time = new Date(appt.starts_at).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Mexico_City',
    })

    const message = [
      `🔔 *Recordatorio de cita*`,
      ``,
      `Hola ${customer.name}, tienes cita en *${org?.name}* hoy a las *${time}*.`,
      ``,
      `📋 Servicio: ${svc?.name ?? 'N/A'}`,
      `💈 Con: ${stf?.name ?? 'N/A'}`,
      ``,
      `¿Necesitas cancelar? Responde este mensaje.`,
    ].join('\n')

    try {
      const r = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, to: customer.phone, body: message }),
      })
      if (r.ok) {
        await service.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.id)
        sent++
      }
    } catch (err) {
      console.error(`Reminder failed for ${appt.id}:`, err)
    }
  }

  return res.status(200).json({ sent, total: appointments.length })
}
