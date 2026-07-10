import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'

// Corre cada 5 min — cancela citas cuyo anticipo no se pagó a tiempo,
// liberando el horario para otro cliente.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const service = createServiceClient()

  const { data: expired, error } = await service
    .from('appointments')
    .select(`
      id, starts_at, organization_id,
      customer:customers(name, phone),
      service:services(name),
      organization:organizations(name, whatsapp_number, ultramsg_instance, ultramsg_token)
    `)
    .eq('deposit_status', 'pending')
    .eq('status', 'confirmed')
    .lt('deposit_expires_at', new Date().toISOString())

  if (error) return res.status(500).json({ error: error.message })
  if (!expired || expired.length === 0) return res.status(200).json({ released: 0 })

  let released = 0

  for (const appt of expired) {
    const customer = appt.customer as unknown as { name: string | null; phone: string } | null
    const svc = appt.service as unknown as { name: string } | null
    const org = appt.organization as unknown as {
      name: string; whatsapp_number: string; ultramsg_instance: string | null; ultramsg_token: string | null
    } | null

    await service.from('appointments').update({
      status: 'cancelled',
      cancelled_by: 'system',
      cancellation_reason: 'Anticipo no pagado a tiempo',
    }).eq('id', appt.id)

    await service.from('audit_logs').insert({
      organization_id: appt.organization_id,
      actor_type: 'system',
      action: 'appointment.cancelled',
      resource_type: 'appointment',
      resource_id: appt.id,
      metadata: { reason: 'deposit_timeout' },
    })

    if (org) {
      const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
      if (customer?.phone) {
        sendMessage(
          customer.phone,
          `Tu horario para *${svc?.name ?? 'tu cita'}* fue liberado porque no recibimos el pago del anticipo a tiempo. Si aún quieres agendar, escríbenos de nuevo. 😊`,
          creds
        ).catch(() => {})
      }
    }

    released++
  }

  return res.status(200).json({ released, total: expired.length })
}
