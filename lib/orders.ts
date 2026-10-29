import { createServiceClient } from '@/lib/supabase/service'
import { fmtMoney, normCurrency } from '@/lib/currency'
import { sendMessage } from '@/lib/ultramsg'
import { stripe } from '@/lib/stripe'
import { stripeFor } from '@/lib/org-stripe'

export type OrderStatus = 'pending' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'

export interface MenuExtra { name: string; price: number }

export interface OrderLineInput {
  /** ID del platillo; si no es válido se intenta resolver por nombre */
  menu_item_id?: string
  /** Nombre del platillo (respaldo cuando el ID se perdió entre mensajes del bot) */
  name?: string
  quantity: number
  /** Nombres de los extras elegidos; se validan contra el menú real */
  extras?: string[]
  notes?: string
}

export interface CreateOrderInput {
  organizationId: string
  customerName: string
  customerPhone: string
  fulfillment: 'delivery' | 'pickup'
  address?: string
  notes?: string
  source: 'web' | 'whatsapp'
  items: OrderLineInput[]
  /** card (por defecto) o cash (efectivo al recibir; solo si el negocio lo permite) */
  payment?: 'card' | 'cash'
  /** Con tarjeta: crea el pedido pero NO el link de pago (el bot lo pide con aprobación del responsable) */
  deferCheckout?: boolean
  /** Pedido que el cliente pidió gestionar con el concierge: se registra sin los candados del catálogo (controlados, receta, existencias, mínimos, catálogo apagado) y sin cobro; lo confirma una persona. */
  concierge?: boolean
}

export type CreateOrderResult =
  | { ok: true; order: { id: string; order_number: number; total: number; subtotal: number; delivery_fee: number }; checkoutUrl: string }
  | { ok: false; error: string; status: number }

export const money = (n: number, currency: unknown = 'mxn') => fmtMoney(n, currency)

export const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'un', 'una', 'al'])

/** Busca un platillo por nombre: exacto primero, luego uno que contenga o esté contenido (si es único). */
export function findByName<T extends { name: string }>(menu: T[], raw: string): T | null {
  const q = norm(raw)
  if (!q) return null
  const exact = menu.filter(m => norm(m.name) === q)
  if (exact.length === 1) return exact[0]
  const partial = menu.filter(m => { const n = norm(m.name); return n.includes(q) || q.includes(n) })
  if (partial.length === 1) return partial[0]
  // Mismas palabras en otro orden ("extra de aguacate" = "Aguacate extra")
  const words = (t: string) => norm(t).split(' ').filter(w => w && !STOP.has(w))
  const qw = words(raw)
  if (!qw.length) return null
  const byWords = menu.filter(m => {
    const nw = words(m.name)
    return qw.every(w => nw.includes(w)) || nw.every(w => qw.includes(w))
  })
  return byWords.length === 1 ? byWords[0] : null
}

const MAX_LINES = 40
const MAX_QTY = 50

/**
 * Crea un pedido. Los precios SIEMPRE se calculan aquí con el menú de la base
 * de datos: nunca se confía en montos que lleguen del navegador o del bot.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const fail = (error: string, status = 400): CreateOrderResult => ({ ok: false, error, status })
  const db = createServiceClient()

  const name = input.customerName?.trim()
  const phone = String(input.customerPhone ?? '').replace(/\D/g, '')
  if (!name) return fail('Falta tu nombre')
  if (phone.length < 8 || phone.length > 15) return fail('El número de WhatsApp no es válido')
  if (!Array.isArray(input.items) || input.items.length === 0) return fail('El pedido está vacío')
  if (input.items.length > MAX_LINES) return fail('El pedido tiene demasiados productos')

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, whatsapp_number, ultramsg_instance, ultramsg_token, is_active, order_card_enabled, order_delivery_enabled, order_pickup_enabled, order_delivery_fee, order_min_amount, order_payment_info, order_accepting, currency, order_cash_enabled, order_card_fee_pct, order_eta_minutes, catalog_enabled')
    .eq('id', input.organizationId)
    .eq('is_active', true)
    .single()
  if (!org) return fail('Negocio no encontrado', 404)
  if (!input.concierge && org.catalog_enabled === false) return fail('El catálogo en línea no está disponible por ahora.', 409)
  if (!input.concierge && !org.order_accepting) return fail('Por ahora no estamos recibiendo pedidos. Intenta más tarde.', 409)

  if (!input.concierge && input.fulfillment === 'delivery' && !org.order_delivery_enabled) return fail('Este negocio no tiene entrega a domicilio')
  if (!input.concierge && input.fulfillment === 'pickup' && !org.order_pickup_enabled) return fail('Este negocio no tiene pedidos para recoger')
  const address = input.address?.trim() ?? ''
  if (!input.concierge && input.fulfillment === 'delivery' && address.length < 6) return fail('Escribe tu dirección de entrega completa')

  const { data: menu } = await db
    .from('menu_items')
    .select('id, name, price, extras, is_available, requires_prescription, controlled')
    .eq('organization_id', org.id)
  const all = menu ?? []
  const byId = new Map(all.map(m => [m.id, m]))

  let subtotal = 0
  const lines: { menu_item_id: string; name: string; unit_price: number; quantity: number; extras: MenuExtra[]; notes: string | null }[] = []
  for (const it of input.items) {
    // El ID del bot puede perderse entre mensajes: se acepta también el nombre del platillo
    const item = (it.menu_item_id ? byId.get(it.menu_item_id) : undefined)
      ?? findByName(all, it.name ?? it.menu_item_id ?? '')
    if (!item && input.concierge) {
      // Lo que no está en el catálogo se registra tal cual lo pidió el cliente, con precio por confirmar
      const free = String(it.name ?? '').trim().slice(0, 120)
      const q = Math.floor(Number(it.quantity)) || 1
      if (!free) return fail('Falta el nombre del producto')
      lines.push({ menu_item_id: null as unknown as string, name: free, unit_price: 0, quantity: Math.min(Math.max(q, 1), MAX_QTY), extras: [], notes: it.notes?.trim().slice(0, 200) || 'Precio por confirmar' })
      continue
    }
    if (!item) return fail(`No encontré "${it.name ?? it.menu_item_id ?? 'ese platillo'}" en el menú`)
    if (!input.concierge && item.controlled) return fail(`"${item.name}" no se vende por este medio`, 409)
    if (!input.concierge && item.requires_prescription) return fail(`"${item.name}" requiere receta médica y no se puede pedir directo. Debe verificarlo el farmacéutico.`, 409)
    if (!input.concierge && !item.is_available) return fail(`"${item.name}" está agotado por hoy`, 409)
    const quantity = Math.floor(Number(it.quantity))
    if (!quantity || quantity < 1 || quantity > MAX_QTY) return fail('Cantidad no válida')

    const catalog: MenuExtra[] = Array.isArray(item.extras) ? item.extras : []
    const chosen: MenuExtra[] = []
    for (const nm of it.extras ?? []) {
      const found = catalog.find(e => e.name === nm) ?? findByName(catalog, nm)
      if (!found) return fail(`El extra "${nm}" no está disponible`)
      chosen.push({ name: found.name, price: Number(found.price) || 0 })
    }
    const unit = Number(item.price) + chosen.reduce((s, e) => s + e.price, 0)
    subtotal += unit * quantity
    lines.push({
      menu_item_id: item.id,
      name: item.name,
      unit_price: unit,
      quantity,
      extras: chosen,
      notes: it.notes?.trim().slice(0, 200) || null,
    })
  }

  const minAmount = Number(org.order_min_amount) || 0
  if (!input.concierge && subtotal < minAmount) return fail(`El pedido mínimo es de ${money(minAmount, org.currency)}`)

  const deliveryFee = !input.concierge && input.fulfillment === 'delivery' ? Number(org.order_delivery_fee) || 0 : 0
  const payment = input.concierge || input.payment === 'cash' ? 'cash' : 'card'
  if (!input.concierge && payment === 'cash' && !org.order_cash_enabled) return fail('Este negocio solo recibe pagos con tarjeta')
  // Cargo de la tarjeta (comisión del procesador): se suma al total solo si paga con tarjeta
  const cardFee = payment === 'card' ? Math.round((subtotal + deliveryFee) * (Number(org.order_card_fee_pct) || 0)) / 100 : 0
  const total = subtotal + deliveryFee + cardFee

  const { data: customer } = await db
    .from('customers')
    .upsert({ organization_id: org.id, phone, name: name }, { onConflict: 'organization_id,phone' })
    .select('id')
    .single()

  const { data: order, error } = await db
    .from('orders')
    .insert({
      organization_id: org.id,
      customer_id: customer?.id ?? null,
      customer_name: name,
      customer_phone: phone,
      fulfillment: input.fulfillment,
      address: input.fulfillment === 'delivery' ? address : null,
      notes: (input.concierge ? `🛎️ CONCIERGE — confirmar con el cliente: disponibilidad, precio, requisitos y pago. ${input.notes?.trim() ?? ''}` : input.notes?.trim() ?? '').trim().slice(0, 300) || null,
      subtotal,
      delivery_fee: deliveryFee,
      card_fee: cardFee,
      total,
      payment_method: payment,
      source: input.source,
    })
    .select('id, order_number')
    .single()
  if (error || !order) {
    console.error('[orders] insert failed', error)
    return fail('No se pudo registrar el pedido. Intenta de nuevo.', 500)
  }

  const { error: itemsError } = await db.from('order_items').insert(lines.map(l => ({ ...l, order_id: order.id })))
  if (itemsError) {
    console.error('[orders] items insert failed', itemsError)
    await db.from('orders').delete().eq('id', order.id)
    return fail('No se pudo registrar el pedido. Intenta de nuevo.', 500)
  }

  // Efectivo: el pedido llega al negocio de inmediato y se paga al recibir
  if (payment === 'cash') {
    await notifyNewOrder(order.id, { skipCustomer: input.source === 'whatsapp' })
    return { ok: true, order: { id: order.id, order_number: Number(order.order_number), total, subtotal, delivery_fee: deliveryFee }, checkoutUrl: '' }
  }
  // Con aprobación previa (bot): el pedido queda sin pagar y oculto; el link lo crea el sistema cuando el responsable aprueba
  if (input.deferCheckout) {
    return { ok: true, order: { id: order.id, order_number: Number(order.order_number), total, subtotal, delivery_fee: deliveryFee }, checkoutUrl: '' }
  }

  // El pago con tarjeta es con Stripe. El pedido queda sin pagar y oculto para
  // el negocio, y no se avisa a nadie hasta que Stripe confirme — ver markOrderPaid.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
    // El negocio puede cobrar por su propia cuenta de Stripe: el dinero va directo a ella
    const orgStripe = await stripeFor(org.id)
    const session = await orgStripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        ...lines.map(l => ({
          quantity: l.quantity,
          price_data: {
            currency: normCurrency(org.currency),
            unit_amount: Math.round(l.unit_price * 100),
            product_data: {
              name: l.extras.length ? `${l.name} (${l.extras.map(e => e.name).join(', ')})` : l.name,
            },
          },
        })),
        ...(cardFee > 0 ? [{
          quantity: 1,
          price_data: { currency: normCurrency(org.currency), unit_amount: Math.round(cardFee * 100), product_data: { name: `Cargo por pago con tarjeta (${Number(org.order_card_fee_pct)}%)` } },
        }] : []),
        ...(deliveryFee > 0 ? [{
          quantity: 1,
          price_data: { currency: normCurrency(org.currency), unit_amount: Math.round(deliveryFee * 100), product_data: { name: 'Envío a domicilio' } },
        }] : []),
      ],
      success_url: `${baseUrl}/pedir/${org.slug}?pago=ok&pedido=${order.order_number}`,
      cancel_url: `${baseUrl}/pedir/${org.slug}?pago=cancelado`,
      metadata: { type: 'order', order_id: order.id, organization_id: org.id },
      payment_intent_data: { description: `Pedido #${order.order_number} — ${org.name}`, metadata: { order_id: order.id } },
    })
    await db.from('orders').update({ stripe_checkout_session_id: session.id }).eq('id', order.id)
    return {
      ok: true,
      order: { id: order.id, order_number: Number(order.order_number), total, subtotal, delivery_fee: deliveryFee },
      checkoutUrl: session.url!,
    }
  } catch (err) {
    console.error('[orders] stripe checkout failed', err)
    await db.from('orders').delete().eq('id', order.id)
    return fail('No se pudo iniciar el pago con tarjeta. Intenta de nuevo en un momento.', 502)
  }
}

/**
 * Avisos por WhatsApp de un pedido nuevo (al negocio y al cliente). Se esperan
 * para que Vercel no corte la función antes de enviarlos. skipCustomer: cuando el
 * bot ya le confirma en el mismo chat no se duplica el mensaje.
 */
export async function notifyNewOrder(orderId: string, opts: { skipCustomer?: boolean } = {}) {
  const db = createServiceClient()
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, organization_id, customer_name, customer_phone, fulfillment, address, notes, total, payment_method, payment_status, items:order_items(name, quantity, extras, notes)')
    .eq('id', orderId)
    .single()
  if (!order) return
  const { data: org } = await db
    .from('organizations')
    .select('name, whatsapp_number, ultramsg_instance, ultramsg_token, order_payment_info, currency')
    .eq('id', order.organization_id)
    .single()
  if (!org) return

  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  const items = (order.items ?? []) as { name: string; quantity: number; extras: MenuExtra[]; notes: string | null }[]
  const summary = items.map(l => {
    const ex = l.extras?.length ? ` (${l.extras.map(e => e.name).join(', ')})` : ''
    return `${l.quantity} x ${l.name}${ex}${l.notes ? ` — ${l.notes}` : ''}`
  }).join('\n')
  const where = order.fulfillment === 'delivery' ? `Entrega a domicilio: ${order.address}` : 'Pasa a recoger'
  const pay = order.payment_method === 'cash' ? 'Pago en efectivo al recibir'
    : order.payment_method === 'card' ? 'Pagado con tarjeta'
    : 'Pago por transferencia'

  if (org.whatsapp_number) {
    await sendMessage(
      `${org.whatsapp_number}@c.us`,
      `🛎️ *Nuevo pedido #${order.order_number}*\n👤 ${order.customer_name} (${order.customer_phone})\n\n${summary}\n\n${where}\n${pay}\nTotal: ${money(order.total, org.currency)}${order.notes ? `\nNotas: ${order.notes}` : ''}`,
      creds
    ).catch(e => console.error('[orders] owner whatsapp failed', e))
  }
  if (!opts.skipCustomer) {
    const transferNote = order.payment_method === 'transfer' && org.order_payment_info
      ? `\n\nDatos para tu transferencia:\n${org.order_payment_info}` : ''
    await sendMessage(
      order.customer_phone,
      `✅ Recibimos tu pedido #${order.order_number} en *${org.name}*.\n\n${summary}\n\n${where}\nTotal: ${money(order.total, org.currency)} (${pay.toLowerCase()})${transferNote}\n\nTe avisamos por aquí cuando avance.`,
      creds
    ).catch(e => console.error('[orders] customer whatsapp failed', e))
  }
}

/**
 * Marca un pedido con tarjeta como pagado y recién entonces avisa. Idempotente:
 * Stripe puede reenviar el evento y solo la primera vez notifica.
 */
export async function markOrderPaid(orderId: string, paymentIntentId: string | null) {
  const db = createServiceClient()
  const { data: updated } = await db
    .from('orders')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId })
    .eq('id', orderId)
    .eq('payment_status', 'unpaid')
    .select('id')
  if (!updated?.length) return
  await notifyNewOrder(orderId)
}

/** Mensaje al cliente cuando el negocio cambia el estado del pedido. */
export function statusMessage(status: OrderStatus, orderNumber: number, businessName: string, fulfillment: 'delivery' | 'pickup', refunded = false): string | null {
  switch (status) {
    case 'preparing':
      return `👨‍🍳 Tu pedido #${orderNumber} ya se está preparando en *${businessName}*.`
    case 'on_the_way':
      return fulfillment === 'delivery'
        ? `🛵 Tu pedido #${orderNumber} va en camino. ¡Prepárate para recibirlo!`
        : `✅ Tu pedido #${orderNumber} está listo para recoger en *${businessName}*.`
    case 'delivered':
      return `🙌 Pedido #${orderNumber} entregado. ¡Gracias por tu preferencia en *${businessName}*!`
    case 'cancelled':
      return `Lamentamos avisarte que tu pedido #${orderNumber} en *${businessName}* fue cancelado.${refunded ? ' Ya reembolsamos tu pago con tarjeta; puede tardar unos días en reflejarse.' : ''} Escríbenos si necesitas ayuda.`
    default:
      return null
  }
}
