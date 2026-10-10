import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'
import { releaseInstanceFromOrg } from '@/lib/whatsapp-connection'
import { ASSISTANT, BASES, planHasBot, planKeyFor, segmentForType, type PlanKey } from '@/lib/plans'

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

export type AddonResult = { ok: true } | { ok: false; status: number; error: string }

/** Producto de Stripe de una pieza de precio (se crea una sola vez y se reutiliza). */
async function ensureProduct(tag: string, name: string, description: string): Promise<string> {
  const list = await stripe.products.list({ active: true, limit: 100 })
  const found = list.data.find(p => p.metadata?.qt_addon === tag)
  if (found) return found.id
  const created = await stripe.products.create({ name, description, metadata: { qt_addon: tag } })
  return created.id
}
const assistantProductId = () => ensureProduct('asistente', ASSISTANT.name, ASSISTANT.description)

/**
 * Agrega el Asistente de WhatsApp a la suscripción con tarjeta de un negocio.
 * La prueba gratis es solo del plan básico: si el negocio está en prueba, la prueba termina
 * en ese momento y se cobra el plan completo. Ya pagando, se cobra de inmediato la parte
 * proporcional del mes. Si la tarjeta falla no se cambia nada.
 */
export async function addAssistant(orgId: string): Promise<AddonResult> {
  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('business_type, whatsapp_bot_enabled, payment_mode, stripe_subscription_id, subscription_status')
    .eq('id', orgId)
    .single()
  if (!org) return { ok: false, status: 404, error: 'Negocio no encontrado' }
  if (org.whatsapp_bot_enabled) return { ok: false, status: 409, error: 'Tu plan ya incluye el Asistente de WhatsApp' }
  if (org.subscription_status !== 'active') return { ok: false, status: 409, error: 'Activa tu plan primero' }
  // El prepago (OXXO / SPEI) no tiene suscripción que modificar: se agrega al renovar
  if (org.payment_mode === 'prepaid') return { ok: false, status: 409, error: 'Tu plan es prepagado: agrega el asistente al renovar' }
  if (!org.stripe_subscription_id) return { ok: false, status: 409, error: 'No encontramos tu suscripción' }

  const segment = segmentForType(org.business_type)
  const newPlan = planKeyFor(segment, true)

  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    if (sub.status !== 'trialing' && sub.status !== 'active') {
      return { ok: false, status: 409, error: 'Tu suscripción no está activa' }
    }
    if (sub.cancel_at_period_end || sub.cancel_at) {
      return { ok: false, status: 409, error: 'Tu suscripción está programada para cancelarse. Reactívala antes de agregar el asistente.' }
    }

    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{
        price_data: {
          currency: 'mxn',
          product: await assistantProductId(),
          recurring: { interval: 'month' },
          unit_amount: ASSISTANT.amountBySegment[segment],
        },
        quantity: 1,
      }],
      // En prueba: se termina la prueba hoy y se factura el mes completo (sin prorrateo).
      // Ya pagando: se factura de inmediato la parte proporcional del mes.
      ...(sub.status === 'trialing' ? { trial_end: 'now' as const } : {}),
      proration_behavior: sub.status === 'trialing' ? 'none' : 'always_invoice',
      // Si la tarjeta no pasa, no se aplica ningún cambio
      payment_behavior: 'error_if_incomplete',
      metadata: { ...sub.metadata, plan: newPlan },
    })
  } catch (err) {
    console.error('[billing] addAssistant failed:', err)
    return { ok: false, status: 402, error: 'No se pudo cobrar a tu tarjeta. Revisa tu tarjeta en "Administrar suscripción" e intenta de nuevo.' }
  }

  await db.from('organizations').update({ whatsapp_bot_enabled: true, trial_ends_at: null }).eq('id', orgId)
  return { ok: true }
}

/**
 * Quita el Asistente de WhatsApp de la suscripción con tarjeta de un negocio.
 * Se aplica de inmediato: el bot deja de contestar, la parte proporcional que no se
 * usó se abona a la próxima factura, y el WhatsApp se desconecta y su instancia vuelve
 * a la reserva. Funciona también con suscripciones anteriores a los renglones separados.
 */
export async function removeAssistant(orgId: string): Promise<AddonResult> {
  const db = createServiceClient()
  const { data: org } = await db
    .from('organizations')
    .select('business_type, whatsapp_bot_enabled, payment_mode, stripe_subscription_id, subscription_status')
    .eq('id', orgId)
    .single()
  if (!org) return { ok: false, status: 404, error: 'Negocio no encontrado' }
  if (!org.whatsapp_bot_enabled) return { ok: false, status: 409, error: 'Tu plan no incluye el Asistente de WhatsApp' }
  if (org.payment_mode === 'prepaid') return { ok: false, status: 409, error: 'Tu plan es prepagado: elige el plan básico cuando renueves' }
  if (!org.stripe_subscription_id) return { ok: false, status: 409, error: 'No encontramos tu suscripción' }

  const segment = segmentForType(org.business_type)
  const basePlan = planKeyFor(segment, false)

  try {
    const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id, { expand: ['items.data.price.product'] })
    if (sub.status !== 'trialing' && sub.status !== 'active') {
      return { ok: false, status: 409, error: 'Tu suscripción no está activa' }
    }

    // El renglón del asistente (si el cobro se creó con renglones separados)
    const productOf = (i: (typeof sub.items.data)[number]) => i.price.product as unknown as { id: string; name?: string; metadata?: Record<string, string> }
    const addonItem = sub.items.data.find(i => productOf(i).metadata?.qt_addon === 'asistente' || productOf(i).name === ASSISTANT.name)

    const items = addonItem
      ? [{ id: addonItem.id, deleted: true as const }]
      // Suscripción anterior: un solo renglón con todo junto -> se cambia por el plan base
      : [
          ...sub.items.data.map(i => ({ id: i.id, deleted: true as const })),
          {
            price_data: {
              currency: 'mxn',
              product: await ensureProduct(`base-${segment}`, BASES[segment].name, BASES[segment].description),
              recurring: { interval: 'month' as const },
              unit_amount: BASES[segment].amount,
            },
            quantity: 1,
          },
        ]

    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations', // abona lo no usado a la próxima factura
      metadata: { ...sub.metadata, plan: basePlan },
    })
  } catch (err) {
    console.error('[billing] removeAssistant failed:', err)
    return { ok: false, status: 502, error: 'No se pudo quitar el asistente. Intenta de nuevo en un momento.' }
  }

  // Primero se apaga el bot (el webhook deja de contestar) y después se libera la línea
  await db.from('organizations').update({ whatsapp_bot_enabled: false }).eq('id', orgId)
  await releaseInstanceFromOrg(orgId)
  return { ok: true }
}
