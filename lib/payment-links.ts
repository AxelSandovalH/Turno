import { createServiceClient } from '@/lib/supabase/service'
import { markOrderPaid } from '@/lib/orders'
import { sendMessage, type UltramsgCreds } from '@/lib/ultramsg'
import { getOrgStripe } from '@/lib/org-stripe'
import { fmtMoney, normCurrency } from '@/lib/currency'
import { phoneKey } from '@/lib/sales/phone'

const MAX_AMOUNT = 5000          // tope por link (en la moneda del negocio)
const MAX_PENDING_PER_CUSTOMER = 3
const EXPIRE_HOURS = 24

/** Número de WhatsApp mexicano en el formato que pide UltraMsg (521 + 10 dígitos); otros países se dejan tal cual. */
export function waId(raw: string): string {
  const d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10) return `521${d}`
  if (d.length === 12 && d.startsWith('52')) return `521${d.slice(2)}`
  return d
}

export const isOwnerPhone = (ownerNumber: string | null | undefined, phone: string) =>
  !!ownerNumber && phoneKey(ownerNumber) === phoneKey(phone)

interface OrgCtx { id: string; name: string; whatsapp_number: string | null; currency: string | null; creds: UltramsgCreds }

/** El bot pide un link: se guarda como pendiente y se le consulta al dueño. El cliente NO recibe nada todavía. */
export async function requestPaymentLink(org: OrgCtx, input: { customerPhone: string; customerName?: string; amount: number; description: string; orderId?: string }): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  if (!org.whatsapp_number) return { ok: false, error: 'El negocio no tiene número del responsable configurado' }
  const amount = Math.round(Number(input.amount) * 100) / 100
  const description = String(input.description ?? '').trim().slice(0, input.orderId ? 400 : 120)
  if (!(amount > 0) || amount > MAX_AMOUNT) return { ok: false, error: `El monto debe estar entre 1 y ${MAX_AMOUNT}` }
  if (description.length < 3) return { ok: false, error: 'Falta la descripción del cobro' }

  const db = createServiceClient()
  const stripe = await getOrgStripe(org.id)
  if (!stripe) return { ok: false, error: 'Este negocio no tiene Stripe propio configurado' }

  const since = new Date(Date.now() - EXPIRE_HOURS * 3600_000).toISOString()
  const { data: pending } = await db.from('payment_link_requests').select('id, code').eq('organization_id', org.id).eq('status', 'pending').gte('created_at', since)
  if ((pending ?? []).filter(p => p).length >= 20) return { ok: false, error: 'Hay demasiadas solicitudes pendientes de aprobar' }
  const { count } = await db.from('payment_link_requests').select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id).eq('customer_phone', input.customerPhone).eq('status', 'pending').gte('created_at', since)
  if ((count ?? 0) >= MAX_PENDING_PER_CUSTOMER) return { ok: false, error: 'Ya hay solicitudes de este cliente esperando aprobación' }

  // Código corto que no choque con otro pendiente del mismo negocio
  const used = new Set((pending ?? []).map(p => p.code))
  let code = ''
  for (let i = 0; i < 20 && (!code || used.has(code)); i++) code = String(Math.floor(1000 + Math.random() * 9000))
  if (used.has(code)) return { ok: false, error: 'No se pudo generar la solicitud, intenta de nuevo' }

  const { error } = await db.from('payment_link_requests').insert({
    organization_id: org.id, code, order_id: input.orderId ?? null, customer_phone: input.customerPhone, customer_name: input.customerName?.slice(0, 80) || null, amount, description,
  })
  if (error) { console.error('[payment-links] insert', error.message); return { ok: false, error: 'No se pudo registrar la solicitud' } }

  await sendMessage(
    `${waId(org.whatsapp_number)}@c.us`,
    `💳 *Solicitud de link de pago*\nCliente: ${input.customerName || 'sin nombre'} (${input.customerPhone})\nConcepto: ${description}\nMonto: ${fmtMoney(amount, org.currency)}\n\nResponde *SI ${code}* para enviarle el link o *NO ${code}* para rechazarla.`,
    org.creds
  ).catch(e => console.error('[payment-links] aviso al dueño falló', e))
  return { ok: true, code }
}

/** Respuesta del dueño ("SI 1234" / "NO 1234"; sin código si hay una sola pendiente). Devuelve true si se atendió. */
export async function handleOwnerDecision(org: OrgCtx & { slug: string }, text: string): Promise<boolean> {
  const t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const m = t.match(/^(si|ok|aprobar|aprobado|autorizo|no|rechazar|rechazo)\b[\s:#-]*(\d{4})?$/)
  if (!m) return false
  const approve = ['si', 'ok', 'aprobar', 'aprobado', 'autorizo'].includes(m[1])
  const db = createServiceClient()
  const since = new Date(Date.now() - EXPIRE_HOURS * 3600_000).toISOString()

  const { data: pend } = await db.from('payment_link_requests').select('*').eq('organization_id', org.id).eq('status', 'pending').gte('created_at', since).order('created_at')
  const list = pend ?? []
  if (list.length === 0) return false // nada pendiente: es un mensaje normal ("SI" a un recordatorio de cita, etc.)

  const req = m[2] ? list.find(r => r.code === m[2]) : list.length === 1 ? list[0] : undefined
  if (!req) {
    const lines = list.map(r => `• ${r.code}: ${r.customer_name || r.customer_phone} — ${r.description} (${fmtMoney(Number(r.amount), org.currency)})`).join('\n')
    await sendMessage(`${waId(org.whatsapp_number ?? '')}@c.us`, `Tienes ${list.length} solicitudes pendientes. Responde con el código:\n${lines}`, org.creds).catch(() => {})
    return true
  }

  // Reclama la solicitud de forma atómica: dos "SI" seguidos no generan dos links
  const { data: claimed } = await db.from('payment_link_requests')
    .update({ status: approve ? 'approved' : 'rejected', decided_at: new Date().toISOString() })
    .eq('id', req.id).eq('status', 'pending').select('id')
  if (!claimed?.length) return true

  const ownerTo = `${waId(org.whatsapp_number ?? '')}@c.us`
  if (!approve) {
    if (req.order_id) await db.from('orders').update({ status: 'cancelled' }).eq('id', req.order_id).eq('organization_id', org.id)
    await sendMessage(ownerTo, `Listo, rechazada la solicitud ${req.code}. No se envió nada al cliente.`, org.creds).catch(() => {})
    await sendMessage(req.customer_phone, 'Por ahora no podemos generar ese cobro. Si necesitas ayuda, escríbenos y con gusto te apoyamos.', org.creds).catch(() => {})
    return true
  }

  try {
    const acct = await getOrgStripe(org.id)
    if (!acct) throw new Error('sin Stripe propio')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
    const session = await acct.client.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: normCurrency(org.currency), unit_amount: Math.round(Number(req.amount) * 100), product_data: { name: String(req.description).slice(0, 120) } } }],
      success_url: `${baseUrl}/deposit/success`,
      cancel_url: `${baseUrl}/deposit/cancelled`,
      metadata: { type: 'custom_payment', request_id: req.id, organization_id: org.id, ...(req.order_id ? { order_id: req.order_id } : {}) },
      payment_intent_data: { description: `${req.description} — ${org.name}`, metadata: { request_id: req.id } },
    })
    await db.from('payment_link_requests').update({ checkout_url: session.url, checkout_session_id: session.id }).eq('id', req.id)
    await sendMessage(req.customer_phone, `Listo. Aquí tienes tu link de pago por *${String(req.description).split('\n')[0]}* (${fmtMoney(Number(req.amount), org.currency)}):\n${session.url}\n\nEs seguro y se paga con tarjeta. Al pagar te avisamos por aquí.`, org.creds)
    await sendMessage(ownerTo, `✅ Link enviado a ${req.customer_name || req.customer_phone} (solicitud ${req.code}). Te aviso cuando lo pague.`, org.creds).catch(() => {})
  } catch (err) {
    console.error('[payment-links] no se pudo crear el link', err)
    await db.from('payment_link_requests').update({ status: 'pending', decided_at: null }).eq('id', req.id)
    await sendMessage(ownerTo, `⚠️ No pude crear el link de ${req.code}. Intenta responder SI ${req.code} otra vez; si sigue fallando revisa la conexión de Stripe.`, org.creds).catch(() => {})
  }
  return true
}

/** Stripe confirmó el pago de un link aprobado: avisa al cliente y al dueño. Idempotente. */
export async function markPaymentLinkPaid(requestId: string, orgId: string, paymentIntent: string | null = null) {
  const db = createServiceClient()
  const { data: updated } = await db.from('payment_link_requests')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', requestId).eq('organization_id', orgId).eq('status', 'approved').select('*')
  const req = updated?.[0]
  if (!req) return
  // Link de un pedido: se marca pagado y ahí mismo se avisa al negocio y al cliente (mismo aviso que un pedido normal)
  if (req.order_id) { await markOrderPaid(req.order_id, paymentIntent); return }
  const { data: org } = await db.from('organizations').select('name, whatsapp_number, ultramsg_instance, ultramsg_token, currency').eq('id', orgId).single()
  if (!org) return
  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  await sendMessage(req.customer_phone, `✅ Recibimos tu pago de ${fmtMoney(Number(req.amount), org.currency)} por *${req.description}*. ¡Gracias!`, creds).catch(() => {})
  if (org.whatsapp_number) await sendMessage(`${waId(org.whatsapp_number)}@c.us`, `💰 *Pago recibido*\n${req.customer_name || req.customer_phone}: ${req.description} — ${fmtMoney(Number(req.amount), org.currency)}`, creds).catch(() => {})
}
