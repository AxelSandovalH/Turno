import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

// Called by Vercel Cron every 30 minutes.
// Finds confirmed appointments starting in 55–75 min that haven't been reminded yet.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protect: only Vercel Cron or internal calls
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const service = createServiceClient()

  const now = new Date()
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000)  // 55 min from now
  const windowEnd   = new Date(now.getTime() + 75 * 60 * 1000)  // 75 min from now

  // Get appointments in window that haven't been reminded
  const { data: appointments, error } = await service
    .from('appointments')
    .select(`
      id,
      starts_at,
      reminder_sent_at,
      organization:organizations(name, whatsapp_number),
      customer:customers(name, phone),
      service:services(name),
      staff:staff(name)
    `)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())

  if (error) {
    console.error('Reminders query error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!appointments || appointments.length === 0) {
    return res.status(200).json({ sent: 0 })
  }

  const instance = process.env.ULTRAMSG_INSTANCE!
  const token    = process.env.ULTRAMSG_TOKEN!
  let sent = 0

  for (const appt of appointments) {
    const customer  = appt.customer as { name: string; phone: string } | null
    const service   = appt.service  as { name: string } | null
    const staff     = appt.staff    as { name: string } | null
    const org       = appt.organization as { name: string } | null

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
      `Hola ${customer.name}, te recordamos que tienes una cita en *${org?.name}* hoy a las *${time}*.`,
      ``,
      `📋 Servicio: ${service?.name ?? 'N/A'}`,
      `💈 Con: ${staff?.name ?? 'N/A'}`,
      ``,
      `Si necesitas cancelar o cambiar, responde este mensaje.`,
    ].join('\n')

    try {
      const r = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, to: customer.phone, body: message }),
      })

      if (r.ok) {
        // Mark reminder as sent
        await service
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', appt.id)
        sent++
      }
    } catch (err) {
      console.error(`Failed to send reminder for appt ${appt.id}:`, err)
    }
  }

  console.log(`Reminders sent: ${sent}/${appointments.length}`)
  return res.status(200).json({ sent, total: appointments.length })
}
