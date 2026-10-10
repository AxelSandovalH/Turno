import { createServiceClient } from '@/lib/supabase/service'
import { planHasBot, type PlanKey } from '@/lib/plans'

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from)
  d.setMonth(d.getMonth() + months)
  return d
}

export interface ActivationResult {
  /** true si es la primera vez que el negocio se activa (para mandar la bienvenida) */
  firstActivation: boolean
  paidUntil: string
  name: string
  whatsappNumber: string
}

/**
 * Activa o renueva un negocio con un prepago (OXXO / SPEI) ya confirmado.
 * Suma los meses a partir de la fecha más lejana entre hoy y el vencimiento actual,
 * así renovar antes de tiempo no pierde días. Idempotente por sesión de Stripe.
 */
export async function activatePrepaid(
  orgId: string, planKey: PlanKey, months: number, sessionId: string
): Promise<ActivationResult | null> {
  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('name, whatsapp_number, subscription_status, paid_until, last_prepaid_session_id')
    .eq('id', orgId)
    .single()
  if (!org) return null
  if (org.last_prepaid_session_id === sessionId) return null // Stripe reenvió el evento

  const now = new Date()
  const current = org.paid_until ? new Date(org.paid_until) : null
  const base = current && current > now ? current : now
  const paidUntil = addMonths(base, months).toISOString()
  const firstActivation = org.subscription_status === 'trialing'

  await db.from('organizations').update({
    subscription_status: 'active',
    payment_mode: 'prepaid',
    paid_until: paidUntil,
    whatsapp_bot_enabled: planHasBot(planKey),
    trial_ends_at: null,
    prepaid_reminder_sent_at: null,
    last_prepaid_session_id: sessionId,
  }).eq('id', orgId)

  return { firstActivation, paidUntil, name: org.name, whatsappNumber: org.whatsapp_number ?? '' }
}
