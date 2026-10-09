import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/ultramsg'
import { statusMessage, type OrderStatus } from '@/lib/orders'

const STATUSES: OrderStatus[] = ['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled']

// Cambia el estado de un pedido del negocio logueado y avisa al cliente por WhatsApp.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const organizationId = user?.user_metadata?.organization_id
  if (!user || !organizationId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const status = body?.status as OrderStatus
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 })

  const db = createServiceClient()
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, status, fulfillment, customer_phone')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (order.status === status) return NextResponse.json({ ok: true })

  const { error } = await db.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: org } = await db.from('organizations').select('name, ultramsg_instance, ultramsg_token').eq('id', organizationId).single()
  const text = org ? statusMessage(status, Number(order.order_number), org.name, order.fulfillment) : null
  if (org && text) {
    await sendMessage(order.customer_phone, text, { instance: org.ultramsg_instance, token: org.ultramsg_token })
      .catch(e => console.error('[orders] status whatsapp failed', e))
  }
  return NextResponse.json({ ok: true })
}
