import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'
import { resend, FROM } from '@/lib/resend'
import { resolvePlan } from '@/lib/plans'
import { trialEndingHtml, trialEndingSubject, trialEndingText } from '@/lib/emails/trial-ending'

// Corre una vez al día — avisa por correo a los negocios cuya prueba gratis termina en
// los próximos 3 días, una sola vez. Si ya cancelaron, no se les escribe.

const HOUR = 3600_000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = createServiceClient()
  const now = Date.now()
  // Ventana de 6 h a 72 h: aunque un día no corra el trabajo, el aviso sale al siguiente
  const { data: orgs, error } = await db
    .from('organizations')
    .select('id, name, email, trial_ends_at, stripe_subscription_id')
    .eq('subscription_status', 'active')
    .is('trial_reminder_sent_at', null)
    .not('trial_ends_at', 'is', null)
    .not('stripe_subscription_id', 'is', null)
    .gt('trial_ends_at', new Date(now + 6 * HOUR).toISOString())
    .lte('trial_ends_at', new Date(now + 72 * HOUR).toISOString())
  if (error) return res.status(500).json({ error: error.message })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  let sent = 0, skipped = 0, failed = 0

  for (const org of orgs ?? []) {
    const markDone = () => db.from('organizations').update({ trial_reminder_sent_at: new Date().toISOString() }).eq('id', org.id)
    try {
      const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id as string)
      // Cancelada o ya fuera de la prueba: no hay nada que avisar
      if (sub.status !== 'trialing' || sub.cancel_at_period_end || sub.cancel_at) { await markDone(); skipped++; continue }

      const { data: owner } = await db
        .from('staff').select('email').eq('organization_id', org.id).eq('is_owner', true).limit(1).maybeSingle()
      const to = owner?.email ?? org.email
      if (!to) { await markDone(); skipped++; continue }

      const plan = resolvePlan(sub.metadata?.plan)
      const chargeDate = new Date(org.trial_ends_at as string).toLocaleDateString('es-MX', {
        timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long',
      })
      const props = { businessName: org.name, planName: plan.name.replace('Turno — ', ''), priceLabel: plan.priceLabel, chargeDate, manageUrl: `${baseUrl}/settings` }

      const { error: sendError } = await resend.emails.send({
        from: FROM, to, subject: trialEndingSubject(chargeDate), html: trialEndingHtml(props), text: trialEndingText(props),
      })
      if (sendError) throw new Error(sendError.message)
      await markDone()
      sent++
    } catch (err) {
      // Sin marcar: se reintenta en la siguiente corrida mientras siga dentro de la ventana
      console.error('[trial-reminders] falló para', org.id, err)
      failed++
    }
  }

  return res.status(200).json({ checked: (orgs ?? []).length, sent, skipped, failed })
}
