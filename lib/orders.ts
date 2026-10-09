import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { stripe } from '@/lib/stripe'

export type OrderStatus = 'pending' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled'

export interface MenuExtra { name: string; price: number }

export interface OrderLineInput {
  menu_item_id: string
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
  paymentMethod: 'cash' | 'transfer' | 'card'
  source: 'web' | 'whatsapp'
  items: OrderLineInput[]
}

export type CreateOrderResult =
  | { ok: true; order: { id: string; order_number: number; total: number; subtotal: number; delivery_fee: number }; paymentInfo: string | null; checkoutUrl: string | null }
  | { ok: false; error: string; status: number }

export const money = (n: number) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

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
    .select('id, name, slug, whatsapp_number, ultramsg_instance, ultramsg_token, is_active, order_card_enabled, order_delivery_enabled, order_pickup_enabled, order_delivery_fee, order_min_amount, order_payment_info, order_accepting')
    .eq('id', input.organizationId)
    .eq('is_active', true)
    .single()
  if (!org) return fail('Negocio no encontrado', 404)
  if (!org.order_accepting) return fail('Por ahora no estamos recibiendo pedidos. Intenta más tarde.', 409)

  if (input.fulfillment === 'delivery' && !org.order_delivery_enabled) return fail('Este negocio no tiene entrega a domicilio')
  if (input.fulfillment === 'pickup' && !org.order_pickup_enabled) return fail('Este negocio no tiene pedidos para recoger')
  if (input.paymentMethod === 'card' && !org.order_card_enabled) return fail('Este negocio no acepta pago con tarjeta')
  const address = input.address?.trim() ?? ''
  if (input.fulfillment === 'delivery' && address.length < 6) return fail('Escribe tu dirección de entrega completa')

  const ids = [...new Set(input.items.map(i => i.menu_item_id))]
  const { data: menu } = await db
    .from('menu_items')
    .select('id, name, price, extras, is_available')
    .eq('organization_id', org.id)
    .in('id', ids)
  const byId = new Map((menu ?? []).map(m => [m.id, m]))

  let subtotal = 0
  const lines: { menu_item_id: string; name: string; unit_price: number; quantity: number; extras: MenuExtra[]; notes: string | null }[] = []
  for (const it of input.items) {
    const item = byId.get(it.menu_item_id)
    if (!item) return fail('Uno de los productos ya no existe en el menú')
    if (!item.is_available) return fail(`"${item.name}" está agotado por hoy`, 409)
    const quantity = Math.floor(Number(it.quantity))
    if (!quantity || quantity < 1 || quantity > MAX_QTY) return fail('Cantidad no válida')

    const catalog: MenuExtra[] = Array.isArray(item.extras) ? item.extras : []
    const chosen: MenuExtra[] = []
    for (const nm of it.extras ?? []) {
      const found = catalog.find(e => e.name === nm)
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
  if (subtotal < minAmount) return fail(`El pedido mínimo es de ${money(minAmount)}`)

  const deliveryFee = input.fulfillment === 'delivery' ? Number(org.order_delivery_fee) || 0 : 0
  const total = subtotal + deliveryFee

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
      notes: input.notes?.trim().slice(0, 300) || null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      payment_method: input.paymentMethod,
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

  // Tarjeta: el pedido queda sin pagar y oculto para el negocio. Se avisa a todos
  // (negocio y cliente) hasta que Stripe confirme el pago — ver markOrderPaid.
  if (input.paymentMethod === 'card') {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          ...lines.map(l => ({
            quantity: l.quantity,
            price_data: {
              currency: 'mxn',
              unit_amount: Math.round(l.unit_price * 100),
              product_data: {
                name: l.extras.length ? `${l.name} (${l.extras.map(e => e.name).join(', ')})` : l.name,
              },
            },
          })),
          ...(deliveryFee > 0 ? [{
            quantity: 1,
            price_data: { currency: 'mxn', unit_amount: Math.round(deliveryFee * 100), product_data: { name: 'Envío a domicilio' } },
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
        paymentInfo: null,
        checkoutUrl: session.url,
      }
    } catch (err) {
      console.error('[orders] stripe checkout failed', err)
      await db.from('orders').delete().eq('id', order.id)
      return fail('No se pudo iniciar el pago con tarjeta. Intenta de nuevo o elige otra forma de pago.', 502)
    }
  }

  await notifyNewOrder(order.id, { skipCustomer: input.source === 'whatsapp' })

  return {
    ok: true,
    order: { id: order.id, order_number: Number(order.order_number), total, subtotal, delivery_fee: deliveryFee },
    paymentInfo: input.paymentMethod === 'transfer' ? org.order_payment_info ?? null : null,
    checkoutUrl: null,
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
    .select('name, whatsapp_number, ultramsg_instance, ultramsg_token, order_payment_info')
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
      `🛎️ *Nuevo pedido #${order.order_number}*\n👤 ${order.customer_name} (${order.customer_phone})\n\n${summary}\n\n${where}\n${pay}\nTotal: ${money(order.total)}${order.notes ? `\nNotas: ${order.notes}` : ''}`,
      creds
    ).catch(e => console.error('[orders] owner whatsapp failed', e))
  }
  if (!opts.skipCustomer) {
    const transferNote = order.payment_method === 'transfer' && org.order_payment_info
      ? `\n\nDatos para tu transferencia:\n${org.order_payment_info}` : ''
    await sendMessage(
      order.customer_phone,
      `✅ Recibimos tu pedido #${order.order_number} en *${org.name}*.\n\n${summary}\n\n${where}\nTotal: ${money(order.total)} (${pay.toLowerCase()})${transferNote}\n\nTe avisamos por aquí cuando avance.`,
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
