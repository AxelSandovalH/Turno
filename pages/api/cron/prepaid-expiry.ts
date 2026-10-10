import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { resend, FROM } from '@/lib/resend'
import { resolvePlan } from '@/lib/plans'
import { prepaidExpiringHtml, prepaidExpiringSubject, prepaidExpiringText } from '@/lib/emails/prepaid-expiring'

// Corre una vez al día para los negocios con plan prepagado (OXXO / SPEI):
//  1) avisa por correo 7 días antes de que venza (una sola vez por periodo);
//  2) suspende a los que ya vencieron, igual que un cobro fallido.
// Una renovación pagada los reactiva sola desde el webhook de Stripe.

const DAY = 24 * 3600_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createServiceClient()
  const now = Date.now()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'

  // 1) Vencidos -> suspendidos
  const { data: expired, error: expiredError } = await db
    .from('organizations')
    .update({ subscription_status: 'suspended', suspended_at: new Date(now).toISOString() })
    .eq('payment_mode', 'prepaid')
    .eq('subscription_status', 'active')
    .lt('paid_until', new Date(now).toISOString())
    .select('id')
  if (expiredError) return res.status(500).json({ error: expiredError.message })

  // 2) Por vencer en 7 días o menos -> aviso único
  const { data: due, error: dueError } = await db
    .from('organizations')
    .select('id, name, email, paid_until, whatsapp_bot_enabled, business_type')
    .eq('payment_mode', 'prepaid')
    .eq('subscription_status', 'active')
    .is('prepaid_reminder_sent_at', null)
    .gt('paid_until', new Date(now).toISOString())
    .lte('paid_until', new Date(now + 7 * DAY).toISOString())
  if (dueError) return res.status(500).json({ error: dueError.message })

  let reminded = 0, failed = 0
  for (const org of due ?? []) {
    try {
      const { data: owner } = await db
        .from('staff').select('email').eq('organization_id', org.id).eq('is_owner', true).limit(1).maybeSingle()
      const to = owner?.email ?? org.email
      if (!to) continue

      const planKey = org.business_type === 'restaurant' ? 'pedidos' : org.whatsapp_bot_enabled ? 'asistente' : 'agenda'
      const dueDate = new Date(org.paid_until as string).toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long',
      })
      const props = { businessName: org.name, planName: resolvePlan(planKey).name.replace('Turno — ', ''), dueDate, renewUrl: `${baseUrl}/payment?renew=1` }
      const { error: sendError } = await resend.emails.send({
        from: FROM, to, subject: prepaidExpiringSubject(dueDate), html: prepaidExpiringHtml(props), text: prepaidExpiringText(props),
      })
      if (sendError) throw new Error(sendError.message)
      await db.from('organizations').update({ prepaid_reminder_sent_at: new Date().toISOString() }).eq('id', org.id)
      reminded++
    } catch (err) {
      console.error('[prepaid-expiry] aviso falló para', org.id, err)
      failed++
    }
  }

  return res.status(200).json({ suspended: (expired ?? []).length, reminded, failed })
}
