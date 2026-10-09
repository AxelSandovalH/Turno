import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createOrder } from '@/lib/orders'

// Pedido desde la página pública /pedir/[slug]. Los precios se recalculan en el servidor.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.slug) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('id').eq('slug', body.slug).eq('is_active', true).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const result = await createOrder({
    organizationId: org.id,
    customerName: String(body.customer_name ?? ''),
    customerPhone: String(body.customer_phone ?? ''),
    fulfillment: body.fulfillment === 'pickup' ? 'pickup' : 'delivery',
    address: body.address ? String(body.address) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
    paymentMethod: body.payment_method === 'transfer' ? 'transfer' : 'cash',
    source: 'web',
    items: Array.isArray(body.items) ? body.items : [],
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, orderNumber: result.order.order_number, total: result.order.total, paymentInfo: result.paymentInfo })
}
