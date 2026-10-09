import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'

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
  paymentMethod: 'cash' | 'transfer'
  source: 'web' | 'whatsapp'
  items: OrderLineInput[]
}

export type CreateOrderResult =
  | { ok: true; order: { id: string; order_number: number; total: number; subtotal: number; delivery_fee: number }; paymentInfo: string | null }
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
    .select('id, name, whatsapp_number, ultramsg_instance, ultramsg_token, is_active, order_delivery_enabled, order_pickup_enabled, order_delivery_fee, order_min_amount, order_payment_info, order_accepting')
    .eq('id', input.organizationId)
    .eq('is_active', true)
    .single()
  if (!org) return fail('Negocio no encontrado', 404)
  if (!org.order_accepting) return fail('Por ahora no estamos recibiendo pedidos. Intenta más tarde.', 409)

  if (input.fulfillment === 'delivery' && !org.order_delivery_enabled) return fail('Este negocio no tiene entrega a domicilio')
  if (input.fulfillment === 'pickup' && !org.order_pickup_enabled) return fail('Este negocio no tiene pedidos para recoger')
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

  // Avisos por WhatsApp: se esperan para que Vercel no corte la función antes de enviarlos
  const creds = { instance: org.ultramsg_instance, token: org.ultramsg_token }
  const summary = lines.map(l => {
    const ex = l.extras.length ? ` (${l.extras.map(e => e.name).join(', ')})` : ''
    return `${l.quantity} x ${l.name}${ex}${l.notes ? ` — ${l.notes}` : ''}`
  }).join('\n')
  const where = input.fulfillment === 'delivery' ? `Entrega a domicilio: ${address}` : 'Pasa a recoger'
  const pay = input.paymentMethod === 'cash' ? 'Pago en efectivo al recibir' : 'Pago por transferencia'

  if (org.whatsapp_number) {
    await sendMessage(
      `${org.whatsapp_number}@c.us`,
      `🛎️ *Nuevo pedido #${order.order_number}*\n👤 ${name} (${phone})\n\n${summary}\n\n${where}\n${pay}\nTotal: ${money(total)}${input.notes ? `\nNotas: ${input.notes}` : ''}`,
      creds
    ).catch(e => console.error('[orders] owner whatsapp failed', e))
  }
  const transferNote = input.paymentMethod === 'transfer' && org.order_payment_info
    ? `\n\nDatos para tu transferencia:\n${org.order_payment_info}` : ''
  // Por WhatsApp el bot ya le confirma en el mismo chat: no duplicar el mensaje
  if (input.source !== 'whatsapp') await sendMessage(
    phone,
    `✅ Recibimos tu pedido #${order.order_number} en *${org.name}*.\n\n${summary}\n\n${where}\nTotal: ${money(total)} (${pay.toLowerCase()})${transferNote}\n\nTe avisamos por aquí cuando avance.`,
    creds
  ).catch(e => console.error('[orders] customer whatsapp failed', e))

  return {
    ok: true,
    order: { id: order.id, order_number: Number(order.order_number), total, subtotal, delivery_fee: deliveryFee },
    paymentInfo: input.paymentMethod === 'transfer' ? org.order_payment_info ?? null : null,
  }
}

/** Mensaje al cliente cuando el negocio cambia el estado del pedido. */
export function statusMessage(status: OrderStatus, orderNumber: number, businessName: string, fulfillment: 'delivery' | 'pickup'): string | null {
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
      return `Lamentamos avisarte que tu pedido #${orderNumber} en *${businessName}* fue cancelado. Escríbenos si necesitas ayuda.`
    default:
      return null
  }
}
